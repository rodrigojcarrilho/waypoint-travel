import { prisma } from "./db";
import { memberDisplayName } from "./utils";

export type BalanceEntry = {
  memberId: string;
  name: string;
  paid: number;
  owed: number;
  net: number;
};

export type Settlement = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
};

export function computeBalances(
  members: Array<{ id: string; guest?: { displayName: string } | null; user?: { name: string | null; email: string | null } | null }>,
  expenses: Array<{
    amount: number;
    paidById: string;
    splitType?: "PERSONAL" | "SHARED";
    splits: Array<{ memberId: string; amount: number }>;
  }>
): BalanceEntry[] {
  const balances = new Map<string, BalanceEntry>();

  for (const member of members) {
    balances.set(member.id, {
      memberId: member.id,
      name: memberDisplayName(member),
      paid: 0,
      owed: 0,
      net: 0,
    });
  }

  for (const expense of expenses) {
    if (expense.splitType === "PERSONAL") continue;

    const payer = balances.get(expense.paidById);
    if (payer) payer.paid += expense.amount;

    for (const split of expense.splits) {
      const member = balances.get(split.memberId);
      if (member) member.owed += split.amount;
    }
  }

  for (const entry of balances.values()) {
    entry.net = entry.paid - entry.owed;
  }

  return Array.from(balances.values());
}

export function simplifyDebts(balances: BalanceEntry[]): Settlement[] {
  const debtors = balances
    .filter((b) => b.net < -0.01)
    .map((b) => ({ ...b, remaining: -b.net }))
    .sort((a, b) => b.remaining - a.remaining);

  const creditors = balances
    .filter((b) => b.net > 0.01)
    .map((b) => ({ ...b, remaining: b.net }))
    .sort((a, b) => b.remaining - a.remaining);

  const settlements: Settlement[] = [];

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.remaining, creditor.remaining);

    if (amount > 0.01) {
      settlements.push({
        fromId: debtor.memberId,
        fromName: debtor.name,
        toId: creditor.memberId,
        toName: creditor.name,
        amount: Math.round(amount * 100) / 100,
      });
    }

    debtor.remaining -= amount;
    creditor.remaining -= amount;

    if (debtor.remaining <= 0.01) i++;
    if (creditor.remaining <= 0.01) j++;
  }

  return settlements;
}

export async function logActivity(
  tripId: string,
  memberId: string | null,
  entityType: string,
  entityId: string | null,
  action: string,
  snapshot: unknown
) {
  await prisma.activityLog.create({
    data: {
      tripId,
      memberId,
      entityType,
      entityId,
      action,
      snapshot: JSON.stringify(snapshot),
    },
  });
}

export async function notifyTripMembers(
  tripId: string,
  title: string,
  message: string,
  excludeMemberId?: string,
  type: "TRIP_UPDATE" | "MEMBER_JOINED" | "EXPENSE_ADDED" | "INVITE" | "SYSTEM" = "TRIP_UPDATE"
) {
  const members = await prisma.tripMember.findMany({ where: { tripId } });

  await prisma.notification.createMany({
    data: members
      .filter((m) => m.id !== excludeMemberId)
      .map((m) => ({
        tripId,
        memberId: m.id,
        type,
        title,
        message,
      })),
  });
}

export async function updatePresence(tripId: string, memberId: string, section?: string) {
  await prisma.presenceSession.upsert({
    where: { tripId_memberId: { tripId, memberId } },
    create: { tripId, memberId, currentSection: section, lastSeenAt: new Date() },
    update: { currentSection: section, lastSeenAt: new Date() },
  });
}

export async function getActivePresence(tripId: string, currentMemberId: string) {
  const cutoff = new Date(Date.now() - 2 * 60 * 1000);
  const sessions = await prisma.presenceSession.findMany({
    where: {
      tripId,
      memberId: { not: currentMemberId },
      lastSeenAt: { gte: cutoff },
    },
    include: {
      member: { include: { guest: true, user: true } },
    },
  });

  return sessions.map((s) => ({
    memberId: s.memberId,
    name: memberDisplayName(s.member),
    section: s.currentSection,
    lastSeenAt: s.lastSeenAt,
  }));
}
