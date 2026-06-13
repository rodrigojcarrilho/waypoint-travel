import { prisma } from "./db";
import { buildExpenseSplits, type SplitInput } from "./expense-splits";

export type BookingExpenseInput = {
  paidById: string;
  splitType: "PERSONAL" | "SHARED";
  splitMode: "EQUAL" | "CUSTOM";
  memberIds?: string[];
  customSplits?: Record<string, number>;
};

export type BookingExpenseLinkField =
  | "linkedAccommodationId"
  | "linkedFlightId"
  | "linkedTransferId"
  | "linkedCarRentalId";

type BookingExpenseDetails = {
  title: string;
  expenseDate: Date;
  costAmount: number | null;
  costCurrency: string | null;
};

export async function syncBookingExpense(
  tripId: string,
  linkField: BookingExpenseLinkField,
  entityId: string,
  details: BookingExpenseDetails,
  tracking?: BookingExpenseInput | null
) {
  const existing = await prisma.expense.findFirst({
    where: { [linkField]: entityId },
  });

  if (!details.costAmount || details.costAmount <= 0) {
    if (existing) await prisma.expense.delete({ where: { id: existing.id } });
    return null;
  }

  if (tracking === null) {
    if (existing) await prisma.expense.delete({ where: { id: existing.id } });
    return null;
  }

  if (!tracking?.paidById) return existing;

  const members = await prisma.tripMember.findMany({ where: { tripId } });
  const memberIds =
    tracking.splitType === "PERSONAL"
      ? [tracking.paidById]
      : tracking.memberIds?.length
        ? tracking.memberIds
        : members.map((m) => m.id);

  const splitInput: SplitInput = {
    splitType: tracking.splitType,
    splitMode: tracking.splitMode,
    amount: details.costAmount,
    paidById: tracking.paidById,
    memberIds,
    customSplits: tracking.customSplits,
  };

  const splits = buildExpenseSplits(splitInput);
  const currency = details.costCurrency || "USD";

  if (existing) {
    await prisma.expenseSplit.deleteMany({ where: { expenseId: existing.id } });
    return prisma.expense.update({
      where: { id: existing.id },
      data: {
        title: details.title,
        amount: details.costAmount,
        currency,
        paidById: tracking.paidById,
        expenseDate: details.expenseDate,
        splitType: tracking.splitType,
        splitMode: tracking.splitMode,
        splits: { create: splits },
      },
    });
  }

  return prisma.expense.create({
    data: {
      tripId,
      title: details.title,
      amount: details.costAmount,
      currency,
      paidById: tracking.paidById,
      expenseDate: details.expenseDate,
      splitType: tracking.splitType,
      splitMode: tracking.splitMode,
      [linkField]: entityId,
      splits: { create: splits },
    },
  });
}

export async function deleteLinkedBookingExpense(linkField: BookingExpenseLinkField, entityId: string) {
  await prisma.expense.deleteMany({ where: { [linkField]: entityId } });
}
