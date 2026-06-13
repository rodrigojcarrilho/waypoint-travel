"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  CalendarDays,
  Car,
  Copy,
  KeyRound,
  Map as MapIcon,
  Plane,
  Receipt,
  Settings,
  Users,
} from "lucide-react";
import { CalendarViews } from "@/components/calendar-views";
import { GuestGate, getStoredDisplayName } from "@/components/guest-gate";
import { PresenceBanner, usePresence } from "@/components/presence";
import { ExpensesTab } from "@/components/expenses-tab";
import { FlightsTab } from "@/components/flights-tab";
import { InviteLink } from "@/components/invite-link";
import { RentalsTab } from "@/components/rentals-tab";
import { StaysTab } from "@/components/stays-tab";
import { TransfersTab } from "@/components/transfers-tab";
import { TripPlanView } from "@/components/trip-plan-view";
import { TripSectionNav } from "@/components/trip-section-nav";
import { TripSummaryCard } from "@/components/trip-summary-card";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { lookupAirport } from "@/lib/airports";
import { buildChronologicalRouteCoords, buildTripJourney } from "@/lib/stay-itinerary";
import type { CalendarEvent } from "@/lib/calendar";
import { parseDestinations } from "@/lib/flight-itinerary";
import { formatDate, formatDateTime, memberDisplayName } from "@/lib/utils";
import type { MapPoint } from "@/components/trip-map";

type Tab = "plan" | "flights" | "stays" | "transfers" | "rentals" | "expenses" | "calendar" | "members" | "settings";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "plan", label: "Plan", icon: <MapIcon className="h-4 w-4" /> },
  { id: "flights", label: "Flights", icon: <Plane className="h-4 w-4" /> },
  { id: "stays", label: "Stays", icon: <BedDouble className="h-4 w-4" /> },
  { id: "transfers", label: "Transfers", icon: <Car className="h-4 w-4" /> },
  { id: "rentals", label: "Car rental", icon: <KeyRound className="h-4 w-4" /> },
  { id: "expenses", label: "Expenses", icon: <Receipt className="h-4 w-4" /> },
  { id: "calendar", label: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
  { id: "members", label: "Members", icon: <Users className="h-4 w-4" /> },
  { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

function TripDashboardContent() {
  const params = useParams<{ tripId: string }>();
  const router = useRouter();
  const tripId = params.tripId;
  const [tab, setTab] = useState<Tab>("plan");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");

  usePresence(tripId, tab);

  const load = useCallback(async () => {
    const res = await fetch(`/api/trips/${tripId}`);
    if (res.status === 403) {
      setError("You don't have access to this trip. Join via an invite link.");
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError("Trip not found");
      setLoading(false);
      return;
    }
    const json = await res.json();
    if (json.calendarEvents) {
      json.calendarEvents = json.calendarEvents.map((e: CalendarEvent & { start: string; end: string }) => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
      }));
    }
    setData(json);
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: getStoredDisplayName() || "Guest" }),
    }).finally(load);
  }, [load]);

  useEffect(() => {
    const formTabs: Tab[] = ["flights", "stays", "transfers", "rentals", "expenses"];
    if (formTabs.includes(tab)) return;

    const interval = setInterval(() => {
      const active = document.activeElement;
      if (active?.matches("input, textarea, select")) return;
      load();
    }, 60000);
    return () => clearInterval(interval);
  }, [load, tab]);

  const mapPoints = useMemo(() => {
    if (!data?.trip) return [];
    const itinerary = data.trip.itineraryItems
      .filter((i: any) => i.latitude && i.longitude)
      .map((i: any) => ({
        id: i.id,
        title: i.title,
        latitude: i.latitude,
        longitude: i.longitude,
        type: "itinerary" as const,
      }));
    const stays = data.trip.accommodations
      .filter((a: any) => a.latitude && a.longitude)
      .map((a: any) => ({
        id: a.id,
        title: a.name,
        latitude: a.latitude,
        longitude: a.longitude,
        type: "accommodation" as const,
      }));
    const flightPoints = (data.trip.flights as any[]).flatMap((f) => {
      const dep = lookupAirport(f.departureAirport);
      const arr = lookupAirport(f.arrivalAirport);
      const points = [];
      if (dep) points.push({ id: `dep-${f.id}`, title: dep.city, latitude: dep.latitude, longitude: dep.longitude, type: "flight" as const });
      if (arr) points.push({ id: `arr-${f.id}`, title: arr.city, latitude: arr.latitude, longitude: arr.longitude, type: "flight" as const });
      return points;
    });
    const seen = new Set<string>();
    return [...itinerary, ...stays, ...flightPoints].filter((p) => {
      const key = `${p.latitude},${p.longitude}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data]);

  const journeyStops = useMemo(() => {
    if (!data?.trip) return [];
    return buildTripJourney({
      flights: data.trip.flights,
      accommodations: data.trip.accommodations,
      itineraryItems: data.trip.itineraryItems,
      origin: data.trip.origin,
    });
  }, [data]);

  const routeCoords = useMemo(() => {
    if (!data?.trip) return [];
    return buildChronologicalRouteCoords(
      data.trip.flights,
      data.trip.accommodations,
      data.trip.itineraryItems
    );
  }, [data]);

  async function createInvite() {
    const res = await fetch(`/api/trips/${tripId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "EDITOR" }),
    });
    const json = await res.json();
    const url = `${window.location.origin}/invite/${json.invite.token}`;
    setInviteUrl(url);
  }

  if (loading) return <p className="text-slate-500">Loading trip...</p>;
  if (error) {
    return (
      <Card>
        <p className="text-slate-700">{error}</p>
        <Button className="mt-4" variant="secondary" onClick={() => router.push("/")}>
          Back to trips
        </Button>
      </Card>
    );
  }

  const { trip, balances, settlements, calendarEvents, presence, currentMember } = data;
  const canEdit = currentMember.role === "OWNER" || currentMember.role === "EDITOR";

  return (
    <div className="animate-fade-in space-y-5">
      <div className="sticky top-16 z-30 -mx-4 flex items-center gap-2 bg-[#f6f5f2]/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="min-w-0 flex-1">
          <TripSectionNav sections={tabs} activeId={tab} onChange={(id) => setTab(id as Tab)} />
        </div>
        {canEdit && (
          <Button variant="secondary" size="sm" onClick={createInvite} className="shrink-0">
            <Copy className="mr-2 h-4 w-4" />
            Invite
          </Button>
        )}
      </div>

      {inviteUrl && <InviteLink url={inviteUrl} />}

      <TripSummaryCard
        trip={trip}
        journeyStops={journeyStops}
        calendarEvents={calendarEvents as CalendarEvent[]}
        memberCount={trip.members.length}
        settlements={settlements}
      />

      <PresenceBanner presence={presence ?? []} />

      {tab === "plan" && (
        <TripPlanView
          tripId={tripId}
          trip={trip}
          items={trip.itineraryItems}
          mapPoints={mapPoints as MapPoint[]}
          routeCoords={routeCoords}
          journeyStops={journeyStops}
          canEdit={canEdit}
          onChange={load}
        />
      )}

      {tab === "flights" && (
        <FlightsTab
          tripId={tripId}
          flights={trip.flights}
          expenses={trip.expenses}
          members={trip.members}
          canEdit={canEdit}
          onChange={load}
        />
      )}

      {tab === "stays" && (
        <StaysTab
          tripId={tripId}
          stays={trip.accommodations}
          expenses={trip.expenses}
          tripStart={trip.startDate}
          tripEnd={trip.endDate}
          members={trip.members}
          canEdit={canEdit}
          onChange={load}
        />
      )}

      {tab === "transfers" && (
        <TransfersTab
          tripId={tripId}
          transfers={trip.transfers}
          expenses={trip.expenses}
          members={trip.members}
          canEdit={canEdit}
          onChange={load}
        />
      )}

      {tab === "rentals" && (
        <RentalsTab
          tripId={tripId}
          rentals={trip.carRentals ?? []}
          expenses={trip.expenses}
          members={trip.members}
          canEdit={canEdit}
          onChange={load}
        />
      )}

      {tab === "expenses" && (
        <ExpensesTab
          tripId={tripId}
          expenses={trip.expenses}
          members={trip.members}
          balances={balances}
          settlements={settlements}
          canEdit={canEdit}
          onChange={load}
        />
      )}

      {tab === "calendar" && (
        <CalendarViews
          events={calendarEvents}
          tripStart={trip.startDate}
          tripEnd={trip.endDate}
          tripId={tripId}
        />
      )}

      {tab === "members" && (
        <MembersTab members={trip.members} canEdit={canEdit} onInvite={createInvite} inviteUrl={inviteUrl} />
      )}

      {tab === "settings" && (
        <SettingsTab logs={trip.activityLogs} />
      )}
    </div>
  );
}

function MembersTab({
  members,
  canEdit,
  onInvite,
  inviteUrl,
}: {
  members: any[];
  canEdit: boolean;
  onInvite: () => void;
  inviteUrl: string;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Trip members</h3>
        {canEdit && <Button size="sm" onClick={onInvite}>Generate invite</Button>}
      </div>
      <ul className="mt-4 space-y-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <span className="font-medium">{memberDisplayName(m)}</span>
            <Badge>{m.role.toLowerCase()}</Badge>
          </li>
        ))}
      </ul>
      {inviteUrl && (
        <div className="mt-4">
          <InviteLink url={inviteUrl} />
        </div>
      )}
    </Card>
  );
}

function SettingsTab({ logs }: { logs: any[] }) {
  return (
    <Card>
      <h3 className="font-semibold">Activity history</h3>
      <p className="mt-1 text-sm text-slate-500">Recent changes to help recover context if something was edited.</p>
      <ul className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto">
        {logs.map((log) => (
          <li key={log.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
            <div className="flex justify-between gap-2">
              <span>
                <strong>{log.member ? memberDisplayName(log.member) : "System"}</strong> {log.action} {log.entityType}
              </span>
              <span className="shrink-0 text-xs text-slate-500">{formatDateTime(log.createdAt)}</span>
            </div>
          </li>
        ))}
        {logs.length === 0 && <li className="text-slate-500">No activity yet</li>}
      </ul>
    </Card>
  );
}

export default function TripPage() {
  return (
    <GuestGate>
      <TripDashboardContent />
    </GuestGate>
  );
}
