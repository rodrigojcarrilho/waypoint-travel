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

type Transfer = {
  id: string;
  title: string;
  fromLocation: string;
  toLocation: string;
  datetime: string;
  transportType?: string | null;
  bookingRef?: string | null;
  notes?: string | null;
  costAmount?: number | null;
  costCurrency?: string | null;
};

type TransferForm = {
  title: string;
  fromLocation: string;
  toLocation: string;
  datetime: string;
  transportType: string;
  bookingRef: string;
  notes: string;
} & CostExpenseFormFields;

function emptyTransferForm(members: Member[]): TransferForm {
  return {
    title: "",
    fromLocation: "",
    toLocation: "",
    datetime: "",
    transportType: "",
    bookingRef: "",
    notes: "",
    ...defaultCostExpenseFields(members.map((m) => m.id)),
  };
}

function transferFormFromRecord(transfer: Transfer, members: Member[], expenses: TripLinkedExpense[]): TransferForm {
  const linked = findLinkedExpense(expenses, "linkedTransferId", transfer.id);
  return {
    title: transfer.title,
    fromLocation: transfer.fromLocation,
    toLocation: transfer.toLocation,
    datetime: toDatetimeLocalValue(transfer.datetime),
    transportType: transfer.transportType ?? "",
    bookingRef: transfer.bookingRef ?? "",
    notes: transfer.notes ?? "",
    ...costExpenseFromLinked(linked, members, transfer.costAmount, transfer.costCurrency),
  };
}

export function TransfersTab({
  tripId,
  transfers,
  expenses,
  members,
  canEdit,
  onChange,
}: {
  tripId: string;
  transfers: Transfer[];
  expenses: TripLinkedExpense[];
  members: Member[];
  canEdit: boolean;
  onChange: () => void;
}) {
  const [form, setForm] = useState(() => emptyTransferForm(members));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TransferForm | null>(null);

  async function addTransfer(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/trips/${tripId}/transfers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        appendCostExpenseToPayload(
          {
            title: form.title,
            fromLocation: form.fromLocation,
            toLocation: form.toLocation,
            datetime: form.datetime,
            transportType: form.transportType || undefined,
            bookingRef: form.bookingRef || undefined,
            notes: form.notes || undefined,
          },
          form
        )
      ),
    });
    setForm(emptyTransferForm(members));
    onChange();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editForm) return;
    await fetch(`/api/trips/${tripId}/transfers/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        appendCostExpenseToPayload(
          {
            title: editForm.title,
            fromLocation: editForm.fromLocation,
            toLocation: editForm.toLocation,
            datetime: editForm.datetime,
            transportType: editForm.transportType || undefined,
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

  function TransferFields({ value, onChangeForm }: { value: TransferForm; onChangeForm: (f: TransferForm) => void }) {
    return (
      <>
        <div className="sm:col-span-2">
          <Label>Title</Label>
          <Input required value={value.title} onChange={(e) => onChangeForm({ ...value, title: e.target.value })} placeholder="Airport to hotel" />
        </div>
        <div>
          <Label>From</Label>
          <Input required value={value.fromLocation} onChange={(e) => onChangeForm({ ...value, fromLocation: e.target.value })} />
        </div>
        <div>
          <Label>To</Label>
          <Input required value={value.toLocation} onChange={(e) => onChangeForm({ ...value, toLocation: e.target.value })} />
        </div>
        <div>
          <Label>Date & time</Label>
          <Input required type="datetime-local" value={value.datetime} onChange={(e) => onChangeForm({ ...value, datetime: e.target.value })} />
        </div>
        <div>
          <Label>Transport type</Label>
          <Input value={value.transportType} onChange={(e) => onChangeForm({ ...value, transportType: e.target.value })} placeholder="Taxi, train, shuttle..." />
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
          <h3 className="font-semibold">Add transfer</h3>
          <form onSubmit={addTransfer} className="mt-3 grid gap-3 sm:grid-cols-2">
            <TransferFields value={form} onChangeForm={setForm} />
            <Button type="submit" className="sm:col-span-2">
              Add transfer
            </Button>
          </form>
        </Card>
      )}

      {transfers.map((transfer) => (
        <Card key={transfer.id}>
          {editingId === transfer.id && editForm ? (
            <form onSubmit={saveEdit} className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 flex items-center justify-between">
                <h3 className="font-semibold">Edit transfer</h3>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditForm(null); }}>
                  Cancel
                </Button>
              </div>
              <TransferFields value={editForm} onChangeForm={setEditForm} />
              <Button type="submit" className="sm:col-span-2">
                Save changes
              </Button>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{transfer.title}</h3>
                <p className="mt-1 text-slate-600">
                  {transfer.fromLocation} → {transfer.toLocation}
                </p>
                <p className="mt-2 text-sm text-slate-500">{formatDateTime(transfer.datetime)}</p>
                {transfer.costAmount != null && transfer.costAmount > 0 && (
                  <p className="mt-1 text-sm font-medium text-brand-700">
                    {formatCurrency(transfer.costAmount, transfer.costCurrency ?? "GBP")}
                  </p>
                )}
                {transfer.transportType && <p className="mt-1 text-xs text-slate-500">{transfer.transportType}</p>}
                {transfer.bookingRef && <p className="mt-1 text-xs text-slate-500">Ref: {transfer.bookingRef}</p>}
              </div>
              {canEdit && (
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="secondary" onClick={() => { setEditingId(transfer.id); setEditForm(transferFormFromRecord(transfer, members, expenses)); }}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await fetch(`/api/trips/${tripId}/transfers/${transfer.id}`, { method: "DELETE" });
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

      {transfers.length === 0 && <Card className="text-center text-slate-500">No transfers yet</Card>}
    </div>
  );
}
