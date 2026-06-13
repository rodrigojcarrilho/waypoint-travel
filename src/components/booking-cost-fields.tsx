"use client";

import { Input, Label } from "@/components/ui";
import { memberDisplayName } from "@/lib/utils";
import type { CostExpenseFormFields } from "@/lib/booking-expense-form";

type Member = {
  id: string;
  guest?: { displayName: string } | null;
  user?: { name: string | null; email: string | null } | null;
};

export function BookingCostInputs<T extends Pick<CostExpenseFormFields, "costAmount" | "costCurrency">>({
  form,
  setForm,
}: {
  form: T;
  setForm: (f: T) => void;
}) {
  return (
    <>
      <div>
        <Label>Cost (optional)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={form.costAmount}
          onChange={(e) => setForm({ ...form, costAmount: e.target.value })}
          placeholder="Total booking cost"
        />
      </div>
      <div>
        <Label>Currency</Label>
        <Input value={form.costCurrency} onChange={(e) => setForm({ ...form, costCurrency: e.target.value })} />
      </div>
    </>
  );
}

export function BookingExpenseTracking<T extends CostExpenseFormFields>({
  form,
  setForm,
  members,
}: {
  form: T;
  setForm: (f: T) => void;
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
