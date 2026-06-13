"use client";

import { useState } from "react";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
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

type Rental = {
  id: string;
  company: string;
  pickupLocation: string;
  dropoffLocation?: string | null;
  pickupAt: string;
  returnAt: string;
  bookingRef?: string | null;
  notes?: string | null;
  costAmount?: number | null;
  costCurrency?: string | null;
};

type RentalForm = {
  company: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupAt: string;
  returnAt: string;
  bookingRef: string;
  notes: string;
} & CostExpenseFormFields;

function emptyRentalForm(members: Member[]): RentalForm {
  return {
    company: "",
    pickupLocation: "",
    dropoffLocation: "",
    pickupAt: "",
    returnAt: "",
    bookingRef: "",
    notes: "",
    ...defaultCostExpenseFields(members.map((m) => m.id)),
  };
}

function rentalFormFromRecord(rental: Rental, members: Member[], expenses: TripLinkedExpense[]): RentalForm {
  const linked = findLinkedExpense(expenses, "linkedCarRentalId", rental.id);
  return {
    company: rental.company,
    pickupLocation: rental.pickupLocation,
    dropoffLocation: rental.dropoffLocation ?? "",
    pickupAt: toDatetimeLocalValue(rental.pickupAt),
    returnAt: toDatetimeLocalValue(rental.returnAt),
    bookingRef: rental.bookingRef ?? "",
    notes: rental.notes ?? "",
    ...costExpenseFromLinked(linked, members, rental.costAmount, rental.costCurrency),
  };
}

export function RentalsTab({
  tripId,
  rentals,
  expenses,
  members,
  canEdit,
  onChange,
}: {
  tripId: string;
  rentals: Rental[];
  expenses: TripLinkedExpense[];
  members: Member[];
  canEdit: boolean;
  onChange: () => void;
}) {
  const [form, setForm] = useState(() => emptyRentalForm(members));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RentalForm | null>(null);

  function handlePickupChange(pickupAt: string) {
    setForm((prev) => ({
      ...prev,
      pickupAt,
      returnAt: !prev.returnAt || prev.returnAt < pickupAt ? pickupAt : prev.returnAt,
    }));
  }

  async function addRental(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/trips/${tripId}/rentals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        appendCostExpenseToPayload(
          {
            company: form.company,
            pickupLocation: form.pickupLocation,
            dropoffLocation: form.dropoffLocation || undefined,
            pickupAt: form.pickupAt,
            returnAt: form.returnAt,
            bookingRef: form.bookingRef || undefined,
            notes: form.notes || undefined,
          },
          form
        )
      ),
    });
    setForm(emptyRentalForm(members));
    onChange();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editForm) return;
    await fetch(`/api/trips/${tripId}/rentals/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        appendCostExpenseToPayload(
          {
            company: editForm.company,
            pickupLocation: editForm.pickupLocation,
            dropoffLocation: editForm.dropoffLocation || undefined,
            pickupAt: editForm.pickupAt,
            returnAt: editForm.returnAt,
            bookingRef: editForm.bookingRef || undefined,
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

  function RentalFields({
    value,
    onChangeForm,
    onPickupChange,
  }: {
    value: RentalForm;
    onChangeForm: (f: RentalForm) => void;
    onPickupChange?: (pickupAt: string) => void;
  }) {
    return (
      <>
        <div className="sm:col-span-2">
          <Label>Company</Label>
          <Input required value={value.company} onChange={(e) => onChangeForm({ ...value, company: e.target.value })} placeholder="Hertz, Sixt..." />
        </div>
        <div>
          <Label>Pickup location</Label>
          <Input required value={value.pickupLocation} onChange={(e) => onChangeForm({ ...value, pickupLocation: e.target.value })} />
        </div>
        <div>
          <Label>Drop-off location</Label>
          <Input value={value.dropoffLocation} onChange={(e) => onChangeForm({ ...value, dropoffLocation: e.target.value })} placeholder="Same as pickup if blank" />
        </div>
        <div>
          <Label>Pickup</Label>
          <Input
            required
            type="datetime-local"
            value={value.pickupAt}
            onChange={(e) => (onPickupChange ? onPickupChange(e.target.value) : onChangeForm({ ...value, pickupAt: e.target.value }))}
          />
        </div>
        <div>
          <Label>Return</Label>
          <Input required type="datetime-local" min={value.pickupAt || undefined} value={value.returnAt} onChange={(e) => onChangeForm({ ...value, returnAt: e.target.value })} />
        </div>
        <BookingCostInputs form={value} setForm={onChangeForm} />
        <BookingExpenseTracking form={value} setForm={onChangeForm} members={members} />
        <div>
          <Label>Booking ref</Label>
          <Input value={value.bookingRef} onChange={(e) => onChangeForm({ ...value, bookingRef: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <Textarea value={value.notes} onChange={(e) => onChangeForm({ ...value, notes: e.target.value })} />
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <Card>
          <h3 className="font-semibold">Add car rental</h3>
          <p className="mt-1 text-sm text-slate-500">Separate from transfers — use this for hire cars with pickup and return times.</p>
          <form onSubmit={addRental} className="mt-3 grid gap-3 sm:grid-cols-2">
            <RentalFields value={form} onChangeForm={setForm} onPickupChange={handlePickupChange} />
            <Button type="submit" className="sm:col-span-2">
              Add car rental
            </Button>
          </form>
        </Card>
      )}

      {rentals.map((rental) => (
        <Card key={rental.id}>
          {editingId === rental.id && editForm ? (
            <form onSubmit={saveEdit} className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 flex items-center justify-between">
                <h3 className="font-semibold">Edit car rental</h3>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditForm(null); }}>
                  Cancel
                </Button>
              </div>
              <RentalFields value={editForm} onChangeForm={setEditForm} />
              <Button type="submit" className="sm:col-span-2">
                Save changes
              </Button>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{rental.company}</h3>
                <p className="text-sm text-slate-600">
                  {rental.pickupLocation}
                  {rental.dropoffLocation ? ` → ${rental.dropoffLocation}` : ""}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {formatDateTime(rental.pickupAt)} – {formatDateTime(rental.returnAt)}
                </p>
                {rental.costAmount != null && rental.costAmount > 0 && (
                  <p className="mt-1 text-sm font-medium text-brand-700">
                    {formatCurrency(rental.costAmount, rental.costCurrency ?? "GBP")}
                  </p>
                )}
              </div>
              {canEdit && (
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="secondary" onClick={() => { setEditingId(rental.id); setEditForm(rentalFormFromRecord(rental, members, expenses)); }}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await fetch(`/api/trips/${tripId}/rentals/${rental.id}`, { method: "DELETE" });
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

      {rentals.length === 0 && <Card className="text-center text-slate-500">No car rentals yet</Card>}
    </div>
  );
}
