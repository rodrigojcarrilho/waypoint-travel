export type TripLinkedExpense = {
  linkedAccommodationId?: string | null;
  linkedFlightId?: string | null;
  linkedTransferId?: string | null;
  linkedCarRentalId?: string | null;
  paidById: string;
  splitType: "PERSONAL" | "SHARED";
  splitMode: "EQUAL" | "CUSTOM";
  splits: Array<{ memberId: string; amount: number }>;
};

export type ExpenseLinkField =
  | "linkedAccommodationId"
  | "linkedFlightId"
  | "linkedTransferId"
  | "linkedCarRentalId";

export type CostExpenseFormFields = {
  costAmount: string;
  costCurrency: string;
  trackExpense: boolean;
  paidById: string;
  splitType: "PERSONAL" | "SHARED";
  splitMode: "EQUAL" | "CUSTOM";
  includedMembers: string[];
  customSplits: Record<string, string>;
};

export function defaultCostExpenseFields(memberIds: string[], paidById?: string): CostExpenseFormFields {
  return {
    costAmount: "",
    costCurrency: "GBP",
    trackExpense: false,
    paidById: paidById ?? memberIds[0] ?? "",
    splitType: "SHARED",
    splitMode: "EQUAL",
    includedMembers: memberIds,
    customSplits: {},
  };
}

export function findLinkedExpense(
  expenses: TripLinkedExpense[],
  linkField: ExpenseLinkField,
  entityId: string
) {
  return expenses.find((e) => e[linkField] === entityId);
}

export function costExpenseFromLinked(
  linked: TripLinkedExpense | undefined,
  members: Array<{ id: string }>,
  costAmount?: number | null,
  costCurrency?: string | null
): CostExpenseFormFields {
  const includedMembers =
    linked?.splitType === "SHARED" ? linked.splits.map((s) => s.memberId) : members.map((m) => m.id);
  const customSplits: Record<string, string> = {};
  if (linked?.splitMode === "CUSTOM") {
    for (const split of linked.splits) {
      customSplits[split.memberId] = String(split.amount);
    }
  }

  return {
    costAmount: costAmount ? String(costAmount) : "",
    costCurrency: costCurrency ?? "GBP",
    trackExpense: Boolean(linked),
    paidById: linked?.paidById ?? members[0]?.id ?? "",
    splitType: linked?.splitType ?? "SHARED",
    splitMode: linked?.splitMode ?? "EQUAL",
    includedMembers,
    customSplits,
  };
}

export function appendCostExpenseToPayload(
  body: Record<string, unknown>,
  fields: CostExpenseFormFields
) {
  const costAmount = fields.costAmount ? Number(fields.costAmount) : null;
  body.costAmount = costAmount;
  body.costCurrency = costAmount ? fields.costCurrency : undefined;

  if (costAmount) {
    body.expenseTracking =
      fields.trackExpense && fields.paidById
        ? {
            paidById: fields.paidById,
            splitType: fields.splitType,
            splitMode: fields.splitMode,
            memberIds: fields.splitType === "SHARED" ? fields.includedMembers : undefined,
            customSplits:
              fields.splitType === "SHARED" && fields.splitMode === "CUSTOM"
                ? Object.fromEntries(
                    fields.includedMembers.map((id) => [id, Number(fields.customSplits[id] || 0)])
                  )
                : undefined,
          }
        : null;
  }

  return body;
}
