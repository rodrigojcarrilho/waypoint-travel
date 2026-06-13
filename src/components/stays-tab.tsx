"use client";

import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { formatCurrency, memberDisplayName } from "@/lib/utils";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
  formatStayDateTimeRange,
  isDefaultCheckInTime,
  isDefaultCheckOutTime,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/stay-dates";

type Member = {
  id: string;
  guest?: { displayName: string } | null;
  user?: { name: string | null; email: string | null } | null;
};

type Stay = {
  id: string;
  name: string;
  address?: string | null;
  checkIn: string;
  checkOut: string;
  bookingRef?: string | null;
  url?: string | null;
  notes?: string | null;
  costAmount?: number | null;
  costCurrency?: string | null;
};

type LinkedExpense = {
  linkedAccommodationId?: string | null;
  paidById: string;
  splitType: "PERSONAL" | "SHARED";
  splitMode: "EQUAL" | "CUSTOM";
  splits: Array<{ memberId: string; amount: number }>;
};

type StayForm = {
  name: string;
  address: string;
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  bookingRef: string;
  url: string;
  notes: string;
  costAmount: string;
  costCurrency: string;
  trackExpense: boolean;
  paidById: string;
  splitType: "PERSONAL" | "SHARED";
  splitMode: "EQUAL" | "CUSTOM";
  includedMembers: string[];
  customSplits: Record<string, string>;
};

function emptyForm(tripStart: string, tripEnd: string, members: Member[]): StayForm {
  return {
    name: "",
    address: "",
    checkIn: tripStart.slice(0, 10),
    checkOut: tripEnd.slice(0, 10),
    checkInTime: "",
    checkOutTime: "",
    bookingRef: "",
    url: "",
    notes: "",
    costAmount: "",
    costCurrency: "GBP",
    trackExpense: false,
    paidById: members[0]?.id ?? "",
    splitType: "SHARED",
    splitMode: "EQUAL",
    includedMembers: members.map((m) => m.id),
    customSplits: {},
  };
}

function formFromStay(stay: Stay, members: Member[], expenses: LinkedExpense[]): StayForm {
  const checkIn = new Date(stay.checkIn);
  const checkOut = new Date(stay.checkOut);
  const linked = expenses.find((e) => e.linkedAccommodationId === stay.id);
  const includedMembers = linked?.splitType === "SHARED" ? linked.splits.map((s) => s.memberId) : members.map((m) => m.id);
  const customSplits: Record<string, string> = {};
  if (linked?.splitMode === "CUSTOM") {
    for (const split of linked.splits) {
      customSplits[split.memberId] = String(split.amount);
    }
  }

  return {
    name: stay.name,
    address: stay.address ?? "",
    checkIn: toDateInputValue(checkIn),
    checkOut: toDateInputValue(checkOut),
    checkInTime: isDefaultCheckInTime(checkIn) ? "" : toTimeInputValue(checkIn),
    checkOutTime: isDefaultCheckOutTime(checkOut) ? "" : toTimeInputValue(checkOut),
    bookingRef: stay.bookingRef ?? "",
    url: stay.url ?? "",
    notes: stay.notes ?? "",
    costAmount: stay.costAmount ? String(stay.costAmount) : "",
    costCurrency: stay.costCurrency ?? "GBP",
    trackExpense: Boolean(linked),
    paidById: linked?.paidById ?? members[0]?.id ?? "",
    splitType: linked?.splitType ?? "SHARED",
    splitMode: linked?.splitMode ?? "EQUAL",
    includedMembers,
    customSplits,
  };
}

function payloadFromForm(form: StayForm) {
  const costAmount = form.costAmount ? Number(form.costAmount) : null;
  const body: Record<string, unknown> = {
    name: form.name,
    address: form.address || undefined,
    checkIn: form.checkIn,
    checkOut: form.checkOut,
    checkInTime: form.checkInTime || undefined,
    checkOutTime: form.checkOutTime || undefined,
    bookingRef: form.bookingRef || undefined,
    url: form.url || undefined,
    notes: form.notes || undefined,
    costAmount,
    costCurrency: costAmount ? form.costCurrency : undefined,
  };

  if (costAmount) {
    body.expenseTracking =
      form.trackExpense && form.paidById
        ? {
            paidById: form.paidById,
            splitType: form.splitType,
            splitMode: form.splitMode,
            memberIds: form.splitType === "SHARED" ? form.includedMembers : undefined,
            customSplits:
              form.splitType === "SHARED" && form.splitMode === "CUSTOM"
                ? Object.fromEntries(
                    form.includedMembers.map((id) => [id, Number(form.customSplits[id] || 0)])
                  )
                : undefined,
          }
        : null;
  }

  return body;
}

function CostFields({
  form,
  setForm,
  members,
}: {
  form: StayForm;
  setForm: (f: StayForm) => void;
  members: Member[];
}) {
  if (!form.costAmount) return null;

  function toggleMember(memberId: string) {
    setForm({
      ...form,
      includedMembers: form.includedMembers.includes(memberId)
        ? form.includedMembers.filter((id) => id !== memberId)
        : [...form.includedMembers, memberId],
    });
  }

  const customMembers =
    form.splitMode === "CUSTOM" && form.includedMembers.length
      ? members.filter((m) => form.includedMembers.includes(m.id))
      : members;

  return (
    <div className="sm:col-span-2 rounded-xl border border-brand-100 bg-brand-50/40 p-3">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
        <input
          type="checkbox"
          checked={form.trackExpense}
          onChange={(e) => setForm({ ...form, trackExpense: e.target.checked })}
        />
        Add to trip expenses
      </label>

      {form.trackExpense && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Paid by</Label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.paidById}
              onChange={(e) => setForm({ ...form, paidById: e.target.value })}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {memberDisplayName(m)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={form.splitType === "PERSONAL"}
                onChange={() => setForm({ ...form, splitType: "PERSONAL" })}
              />
              Individual (not split)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={form.splitType === "SHARED"}
                onChange={() => setForm({ ...form, splitType: "SHARED" })}
              />
              Split with group
            </label>
          </div>
          {form.splitType === "SHARED" && (
            <>
              <div className="sm:col-span-2 flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={form.splitMode === "EQUAL"}
                    onChange={() => setForm({ ...form, splitMode: "EQUAL" })}
                  />
                  Equal split
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={form.splitMode === "CUSTOM"}
                    onChange={() => setForm({ ...form, splitMode: "CUSTOM" })}
                  />
                  Custom per person
                </label>
              </div>
              {form.splitMode === "EQUAL" && (
                <div className="sm:col-span-2">
                  <Label>Include in split</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {members.map((m) => (
                      <label
                        key={m.id}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                          form.includedMembers.includes(m.id)
                            ? "border-brand-500 bg-brand-50 text-brand-800"
                            : "border-slate-200 text-slate-500"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={form.includedMembers.includes(m.id)}
                          onChange={() => toggleMember(m.id)}
                        />
                        {memberDisplayName(m)}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {form.splitMode === "CUSTOM" &&
                customMembers.map((m) => (
                  <div key={m.id}>
                    <Label>{memberDisplayName(m)}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.customSplits[m.id] ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, customSplits: { ...form.customSplits, [m.id]: e.target.value } })
                      }
                    />
                  </div>
                ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StayFields({
  form,
  setForm,
  tripStart,
  tripEnd,
  members,
}: {
  form: StayForm;
  setForm: (f: StayForm) => void;
  tripStart: string;
  tripEnd: string;
  members: Member[];
}) {
  return (
    <>
      <div className="sm:col-span-2">
        <Label>Name</Label>
        <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="sm:col-span-2">
        <Label>Address</Label>
        <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </div>
      <div>
        <Label>Check-in date</Label>
        <Input type="date" required min={tripStart.slice(0, 10)} max={tripEnd.slice(0, 10)} value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} />
      </div>
      <div>
        <Label>Check-out date</Label>
        <Input type="date" required min={form.checkIn || tripStart.slice(0, 10)} max={tripEnd.slice(0, 10)} value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} />
      </div>
      <div>
        <Label>Check-in time (optional)</Label>
        <Input type="time" value={form.checkInTime} onChange={(e) => setForm({ ...form, checkInTime: e.target.value })} />
        <p className="mt-1 text-[11px] text-slate-500">Defaults to {DEFAULT_CHECK_IN_TIME}</p>
      </div>
      <div>
        <Label>Check-out time (optional)</Label>
        <Input type="time" value={form.checkOutTime} onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })} />
        <p className="mt-1 text-[11px] text-slate-500">Defaults to {DEFAULT_CHECK_OUT_TIME}</p>
      </div>
      <div>
        <Label>Cost (optional)</Label>
        <Input type="number" step="0.01" min="0" value={form.costAmount} onChange={(e) => setForm({ ...form, costAmount: e.target.value })} placeholder="Total booking cost" />
      </div>
      <div>
        <Label>Currency</Label>
        <Input value={form.costCurrency} onChange={(e) => setForm({ ...form, costCurrency: e.target.value })} />
      </div>
      <CostFields form={form} setForm={setForm} members={members} />
      <div>
        <Label>Booking ref</Label>
        <Input value={form.bookingRef} onChange={(e) => setForm({ ...form, bookingRef: e.target.value })} />
      </div>
      <div>
        <Label>Booking URL</Label>
        <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
      </div>
    </>
  );
}

export function StaysTab({
  tripId,
  stays,
  expenses,
  tripStart,
  tripEnd,
  members,
  canEdit,
  onChange,
}: {
  tripId: string;
  stays: Stay[];
  expenses: LinkedExpense[];
  tripStart: string;
  tripEnd: string;
  members: Member[];
  canEdit: boolean;
  onChange: () => void;
}) {
  const [form, setForm] = useState(() => emptyForm(tripStart, tripEnd, members));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<StayForm | null>(null);

  async function addStay(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/trips/${tripId}/accommodations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadFromForm(form)),
    });
    setForm(emptyForm(tripStart, tripEnd, members));
    onChange();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editForm) return;
    await fetch(`/api/trips/${tripId}/accommodations/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadFromForm(editForm)),
    });
    setEditingId(null);
    setEditForm(null);
    onChange();
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <Card>
          <h3 className="font-semibold">Add accommodation</h3>
          <p className="mt-1 text-xs text-slate-500">
            Add dates, optional cost, and optionally track the booking in trip expenses with equal or custom splits.
          </p>
          <form onSubmit={addStay} className="mt-3 grid gap-3 sm:grid-cols-2">
            <StayFields form={form} setForm={setForm} tripStart={tripStart} tripEnd={tripEnd} members={members} />
            <Button type="submit" className="sm:col-span-2">
              Add stay
            </Button>
          </form>
        </Card>
      )}

      {stays.map((stay) => (
        <Card key={stay.id}>
          {editingId === stay.id && editForm ? (
            <form onSubmit={saveEdit} className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 flex items-center justify-between">
                <h3 className="font-semibold">Edit stay</h3>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditForm(null); }}>
                  Cancel
                </Button>
              </div>
              <StayFields form={editForm} setForm={setEditForm} tripStart={tripStart} tripEnd={tripEnd} members={members} />
              <Button type="submit" className="sm:col-span-2">
                Save changes
              </Button>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{stay.name}</h3>
                {stay.address && <p className="text-sm text-slate-600">{stay.address}</p>}
                <p className="mt-2 text-sm text-slate-500">
                  {formatStayDateTimeRange(new Date(stay.checkIn), new Date(stay.checkOut))}
                </p>
                {stay.costAmount != null && stay.costAmount > 0 && (
                  <p className="mt-1 text-sm font-medium text-brand-700">
                    {formatCurrency(stay.costAmount, stay.costCurrency ?? "GBP")}
                  </p>
                )}
              </div>
              {canEdit && (
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="secondary" onClick={() => { setEditingId(stay.id); setEditForm(formFromStay(stay, members, expenses)); }}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={async () => { await fetch(`/api/trips/${tripId}/accommodations/${stay.id}`, { method: "DELETE" }); onChange(); }}>
                    Remove
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      ))}

      {stays.length === 0 && <Card className="text-center text-slate-500">No accommodations yet</Card>}
    </div>
  );
}
