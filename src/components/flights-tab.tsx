"use client";

import { useState } from "react";
import { Badge, Button, Card, Input, Label, Textarea } from "@/components/ui";
import { BookingCostInputs, BookingExpenseTracking } from "@/components/booking-cost-fields";
import {
  appendCostExpenseToPayload,
  costExpenseFromLinked,
  defaultCostExpenseFields,
  findLinkedExpense,
  type CostExpenseFormFields,
  type TripLinkedExpense,
} from "@/lib/booking-expense-form";
import { formatCurrency, formatDateTime, toDatetimeLocalValue } from "@/lib/utils";

type Member = {
  id: string;
  guest?: { displayName: string } | null;
  user?: { name: string | null; email: string | null } | null;
};

type Flight = {
  id: string;
  airline?: string | null;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  status: string;
  confirmationCode?: string | null;
  notes?: string | null;
  costAmount?: number | null;
  costCurrency?: string | null;
};

type FlightForm = {
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  confirmationCode: string;
  notes: string;
} & CostExpenseFormFields;

function emptyFlightForm(members: Member[]): FlightForm {
  return {
    airline: "",
    flightNumber: "",
    departureAirport: "",
    arrivalAirport: "",
    departureTime: "",
    arrivalTime: "",
    confirmationCode: "",
    notes: "",
    ...defaultCostExpenseFields(members.map((m) => m.id)),
  };
}

function flightFormFromRecord(flight: Flight, members: Member[], expenses: TripLinkedExpense[]): FlightForm {
  const linked = findLinkedExpense(expenses, "linkedFlightId", flight.id);
  return {
    airline: flight.airline ?? "",
    flightNumber: flight.flightNumber,
    departureAirport: flight.departureAirport,
    arrivalAirport: flight.arrivalAirport,
    departureTime: toDatetimeLocalValue(flight.departureTime),
    arrivalTime: toDatetimeLocalValue(flight.arrivalTime),
    confirmationCode: flight.confirmationCode ?? "",
    notes: flight.notes ?? "",
    ...costExpenseFromLinked(linked, members, flight.costAmount, flight.costCurrency),
  };
}

function FlightFields({
  form,
  setForm,
  members,
}: {
  form: FlightForm;
  setForm: (f: FlightForm) => void;
  members: Member[];
}) {
  function handleDepartureChange(departureTime: string) {
    const next = { ...form, departureTime };
    if (!form.arrivalTime && departureTime) {
      const dep = new Date(departureTime);
      if (!Number.isNaN(dep.getTime())) {
        dep.setHours(dep.getHours() + 2);
        next.arrivalTime = toDatetimeLocalValue(dep);
      }
    }
    setForm(next);
  }

  return (
    <>
      <div>
        <Label>Airline</Label>
        <Input value={form.airline} onChange={(e) => setForm({ ...form, airline: e.target.value })} />
      </div>
      <div>
        <Label>Flight number</Label>
        <Input required value={form.flightNumber} onChange={(e) => setForm({ ...form, flightNumber: e.target.value })} />
      </div>
      <div>
        <Label>From</Label>
        <Input required value={form.departureAirport} onChange={(e) => setForm({ ...form, departureAirport: e.target.value })} placeholder="LHR" />
      </div>
      <div>
        <Label>To</Label>
        <Input required value={form.arrivalAirport} onChange={(e) => setForm({ ...form, arrivalAirport: e.target.value })} placeholder="LIS" />
      </div>
      <div>
        <Label>Departure</Label>
        <Input required type="datetime-local" value={form.departureTime} onChange={(e) => handleDepartureChange(e.target.value)} />
      </div>
      <div>
        <Label>Arrival</Label>
        <Input required type="datetime-local" min={form.departureTime || undefined} value={form.arrivalTime} onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })} />
      </div>
      <BookingCostInputs form={form} setForm={setForm} />
      <BookingExpenseTracking form={form} setForm={setForm} members={members} />
      <div>
        <Label>Confirmation</Label>
        <Input value={form.confirmationCode} onChange={(e) => setForm({ ...form, confirmationCode: e.target.value })} />
      </div>
      <div className="sm:col-span-2">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
    </>
  );
}

export function FlightsTab({
  tripId,
  flights,
  expenses,
  members,
  canEdit,
  onChange,
}: {
  tripId: string;
  flights: Flight[];
  expenses: TripLinkedExpense[];
  members: Member[];
  canEdit: boolean;
  onChange: () => void;
}) {
  const [form, setForm] = useState(() => emptyFlightForm(members));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FlightForm | null>(null);

  async function addFlight(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/trips/${tripId}/flights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        appendCostExpenseToPayload(
          {
            airline: form.airline || undefined,
            flightNumber: form.flightNumber,
            departureAirport: form.departureAirport,
            arrivalAirport: form.arrivalAirport,
            departureTime: form.departureTime,
            arrivalTime: form.arrivalTime,
            confirmationCode: form.confirmationCode || undefined,
            notes: form.notes || undefined,
          },
          form
        )
      ),
    });
    setForm(emptyFlightForm(members));
    onChange();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editForm) return;
    await fetch(`/api/trips/${tripId}/flights/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        appendCostExpenseToPayload(
          {
            airline: editForm.airline || undefined,
            flightNumber: editForm.flightNumber,
            departureAirport: editForm.departureAirport,
            arrivalAirport: editForm.arrivalAirport,
            departureTime: editForm.departureTime,
            arrivalTime: editForm.arrivalTime,
            confirmationCode: editForm.confirmationCode || undefined,
            notes: editForm.notes || undefined,
          },
          editForm
        )
      ),
    });
    setEditingId(null);
    setEditForm(null);
    onChange();
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <Card>
          <h3 className="font-semibold">Add flight</h3>
          <form onSubmit={addFlight} className="mt-3 grid gap-3 sm:grid-cols-2">
            <FlightFields form={form} setForm={setForm} members={members} />
            <Button type="submit" className="sm:col-span-2">
              Add flight
            </Button>
          </form>
        </Card>
      )}

      {flights.map((flight) => (
        <Card key={flight.id}>
          {editingId === flight.id && editForm ? (
            <form onSubmit={saveEdit} className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 flex items-center justify-between">
                <h3 className="font-semibold">Edit flight</h3>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditForm(null); }}>
                  Cancel
                </Button>
              </div>
              <FlightFields form={editForm} setForm={setEditForm} members={members} />
              <Button type="submit" className="sm:col-span-2">
                Save changes
              </Button>
            </form>
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{flight.flightNumber}</h3>
                  <Badge>{flight.status.toLowerCase()}</Badge>
                </div>
                <p className="mt-1 text-slate-600">
                  {flight.departureAirport} → {flight.arrivalAirport}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {formatDateTime(flight.departureTime)} – {formatDateTime(flight.arrivalTime)}
                </p>
                {flight.costAmount != null && flight.costAmount > 0 && (
                  <p className="mt-1 text-sm font-medium text-brand-700">
                    {formatCurrency(flight.costAmount, flight.costCurrency ?? "GBP")}
                  </p>
                )}
                {flight.confirmationCode && <p className="mt-1 text-xs text-slate-500">Conf: {flight.confirmationCode}</p>}
              </div>
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <select
                    className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    value={flight.status}
                    onChange={async (e) => {
                      await fetch(`/api/trips/${tripId}/flights/${flight.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: e.target.value }),
                      });
                      onChange();
                    }}
                  >
                    {["SCHEDULED", "DELAYED", "BOARDING", "DEPARTED", "ARRIVED", "CANCELLED", "UNKNOWN"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="secondary" onClick={() => { setEditingId(flight.id); setEditForm(flightFormFromRecord(flight, members, expenses)); }}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await fetch(`/api/trips/${tripId}/flights/${flight.id}`, { method: "DELETE" });
                      onChange();
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      ))}

      {flights.length === 0 && <Card className="text-center text-slate-500">No flights added yet</Card>}
    </div>
  );
}
