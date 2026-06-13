"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Plane, Plus, Users } from "lucide-react";
import { DestinationTagsInput } from "@/components/destination-tags";
import { GuestGate, getStoredDisplayName } from "@/components/guest-gate";
import { Badge, Button, Card, Input, Label, Textarea } from "@/components/ui";
import { displayDestinations, displayJourneyLabel } from "@/lib/flight-itinerary";
import { formatDate } from "@/lib/utils";

type Trip = {
  id: string;
  name: string;
  description: string | null;
  origin: string | null;
  destination: string | null;
  destinations: string | null;
  startDate: string;
  endDate: string;
  role: string;
  memberCount: number;
  _count?: { itineraryItems: number; flights: number; accommodations: number };
};

function HomeContent() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    description: "",
    origin: "",
    destinations: [] as string[],
    startDate: "",
    endDate: "",
  });

  async function loadTrips() {
    const res = await fetch("/api/trips");
    const data = await res.json();
    setTrips(data.trips ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadTrips();
  }, []);

  function handleStartDateChange(startDate: string) {
    setForm((prev) => ({
      ...prev,
      startDate,
      endDate: !prev.endDate || prev.endDate < startDate ? startDate : prev.endDate,
    }));
  }

  async function createTrip(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, displayName: getStoredDisplayName() }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ name: "", description: "", origin: "", destinations: [], startDate: "", endDate: "" });
      loadTrips();
    }
  }

  return (
    <div className="animate-fade-in space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-500 p-8 text-white shadow-lg">
        <p className="text-sm uppercase tracking-widest text-brand-100">Group travel, simplified</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Plan trips together</h1>
        <p className="mt-3 max-w-2xl text-brand-50">
          Itineraries, flights, stays, and shared costs — all in one place for your crew.
        </p>
        <Button
          variant="secondary"
          className="mt-6 border-0 bg-white text-brand-800 hover:bg-brand-50"
          onClick={() => setShowForm(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New trip
        </Button>
      </section>

      {showForm && (
        <Card>
          <h2 className="text-lg font-semibold">Create a trip</h2>
          <form onSubmit={createTrip} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Trip name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="AfroNation 2026" />
            </div>
            <div>
              <Label>Departing from</Label>
              <Input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="London, UK" />
            </div>
            <div className="sm:col-span-2">
              <Label>Destinations</Label>
              <DestinationTagsInput
                value={form.destinations}
                onChange={(destinations) => setForm({ ...form, destinations })}
                placeholder="Lisbon, Portugal"
              />
            </div>
            <div>
              <Label>Start date</Label>
              <Input required type="date" value={form.startDate} onChange={(e) => handleStartDateChange(e.target.value)} />
            </div>
            <div>
              <Label>End date</Label>
              <Input
                required
                type="date"
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional trip notes..." />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit">Create trip</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Your trips</h2>
          <Badge>{trips.length} active</Badge>
        </div>

        {loading ? (
          <p className="text-slate-500">Loading trips...</p>
        ) : trips.length === 0 ? (
          <Card className="text-center">
            <p className="text-slate-600">No trips yet. Create one or join via an invite link.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => {
              const journey = displayJourneyLabel(trip) || displayDestinations(trip);
              return (
                <Link key={trip.id} href={`/trips/${trip.id}`}>
                  <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-semibold text-brand-900">{trip.name}</h3>
                      <Badge>{trip.role.toLowerCase()}</Badge>
                    </div>
                    {journey && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {journey}
                      </p>
                    )}
                    <p className="mt-3 flex items-center gap-1 text-sm text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {trip.memberCount}
                      </span>
                      {trip._count && (
                        <>
                          <span>{trip._count.itineraryItems} stops</span>
                          <span className="flex items-center gap-1">
                            <Plane className="h-3.5 w-3.5" /> {trip._count.flights}
                          </span>
                          <span>{trip._count.accommodations} stays</span>
                        </>
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function HomePage() {
  return (
    <GuestGate>
      <HomeContent />
    </GuestGate>
  );
}
