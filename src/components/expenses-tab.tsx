"use client";

import { useEffect, useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { formatCurrency, formatDate, memberDisplayName } from "@/lib/utils";

type Member = {
  id: string;
  guest?: { displayName: string } | null;
  user?: { name: string | null; email: string | null } | null;
};

export function ExpensesTab({
  tripId,
  expenses,
  members,
  balances,
  settlements,
  canEdit,
  onChange,
}: {
  tripId: string;
  expenses: any[];
  members: Member[];
  balances: any[];
  settlements: any[];
  canEdit: boolean;
  onChange: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    amount: "",
    currency: "GBP",
    paidById: members[0]?.id ?? "",
    notes: "",
    splitType: "SHARED" as "PERSONAL" | "SHARED",
    splitMode: "EQUAL" as "EQUAL" | "CUSTOM",
    includedMembers: [] as string[],
    customSplits: {} as Record<string, string>,
  });

  useEffect(() => {
    if (members.length && form.includedMembers.length === 0) {
      setForm((f) => ({
        ...f,
        paidById: f.paidById || members[0].id,
        includedMembers: members.map((m) => m.id),
      }));
    }
  }, [members, form.includedMembers.length, form.paidById]);

  function toggleMember(memberId: string) {
    setForm((f) => ({
      ...f,
      includedMembers: f.includedMembers.includes(memberId)
        ? f.includedMembers.filter((id) => id !== memberId)
        : [...f.includedMembers, memberId],
    }));
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount);
    let splits: { memberId: string; amount: number }[] = [];

    if (form.splitType === "SHARED") {
      const included = form.includedMembers.length ? form.includedMembers : members.map((m) => m.id);
      if (form.splitMode === "EQUAL") {
        const share = Math.round((amount / included.length) * 100) / 100;
        splits = included.map((memberId, i) => ({
          memberId,
          amount: i === included.length - 1 ? amount - share * (included.length - 1) : share,
        }));
      } else {
        splits = included.map((memberId) => ({
          memberId,
          amount: Number(form.customSplits[memberId] || 0),
        }));
      }
    }

    await fetch(`/api/trips/${tripId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        amount,
        currency: form.currency,
        paidById: form.paidById,
        notes: form.notes || undefined,
        splitType: form.splitType,
        splitMode: form.splitMode,
        memberIds: form.splitType === "SHARED" ? form.includedMembers : undefined,
        splits: form.splitType === "SHARED" && form.splitMode === "CUSTOM" ? splits : undefined,
      }),
    });

    setForm((f) => ({
      ...f,
      title: "",
      amount: "",
      notes: "",
      customSplits: {},
    }));
    onChange();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {canEdit && (
          <Card>
            <h3 className="font-semibold">Add expense</h3>
            <form onSubmit={addExpense} className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              </div>
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

              <div className="sm:col-span-2">
                <Label>Who is this for?</Label>
                <div className="mt-1 flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={form.splitType === "PERSONAL"}
                      onChange={() => setForm({ ...form, splitType: "PERSONAL" })}
                    />
                    Just one person (not split)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={form.splitType === "SHARED"}
                      onChange={() => setForm({ ...form, splitType: "SHARED" })}
                    />
                    Split between the group
                  </label>
                </div>
              </div>

              {form.splitType === "SHARED" && (
                <>
                  <div className="sm:col-span-2">
                    <Label>How to split</Label>
                    <div className="mt-1 flex gap-4 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={form.splitMode === "EQUAL"}
                          onChange={() => setForm({ ...form, splitMode: "EQUAL" })}
                        />
                        Split equally
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={form.splitMode === "CUSTOM"}
                          onChange={() => setForm({ ...form, splitMode: "CUSTOM" })}
                        />
                        Custom amount per person
                      </label>
                    </div>
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
                    members.map((m) => (
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

              <Button type="submit" className="sm:col-span-2">
                Add expense
              </Button>
            </form>
          </Card>
        )}

        {expenses.map((expense) => (
          <Card key={expense.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{expense.title}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-600">
                    {expense.splitType === "PERSONAL"
                      ? "Individual"
                      : expense.splitMode === "CUSTOM"
                        ? "Custom split"
                        : "Equal split"}
                  </span>
                </div>
                <p className="text-lg text-brand-700">{formatCurrency(expense.amount, expense.currency)}</p>
                <p className="text-sm text-slate-500">
                  Paid by {memberDisplayName(expense.paidBy)} · {formatDate(expense.expenseDate)}
                </p>
                {expense.splitType === "SHARED" && (
                  <ul className="mt-2 text-xs text-slate-500">
                    {expense.splits.map((s: any) => (
                      <li key={s.id}>
                        {memberDisplayName(s.member)} owes {formatCurrency(s.amount, expense.currency)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await fetch(`/api/trips/${tripId}/expenses/${expense.id}`, { method: "DELETE" });
                    onChange();
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <Card>
          <h3 className="font-semibold">Who owes whom</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {settlements.length === 0 ? (
              <li className="text-slate-500">All settled</li>
            ) : (
              settlements.map((s: any, i: number) => (
                <li key={i} className="rounded-lg bg-brand-50 px-3 py-2">
                  <strong>{s.fromName}</strong> → <strong>{s.toName}</strong>: {formatCurrency(s.amount)}
                </li>
              ))
            )}
          </ul>
        </Card>
        <Card>
          <h3 className="font-semibold">Member balances</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {balances.map((b: any) => (
              <li key={b.memberId} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span>{b.name}</span>
                <span className={b.net >= 0 ? "text-emerald-700" : "text-rose-700"}>
                  {b.net >= 0 ? "+" : ""}
                  {formatCurrency(b.net)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
