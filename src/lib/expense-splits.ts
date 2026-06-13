export type SplitInput = {
  splitType: "PERSONAL" | "SHARED";
  splitMode: "EQUAL" | "CUSTOM";
  amount: number;
  paidById: string;
  memberIds: string[];
  customSplits?: Record<string, number>;
};

export function buildExpenseSplits(input: SplitInput): Array<{ memberId: string; amount: number }> {
  if (input.splitType === "PERSONAL") {
    return [{ memberId: input.paidById, amount: input.amount }];
  }

  const members = input.memberIds.length > 0 ? input.memberIds : [input.paidById];

  if (input.splitMode === "CUSTOM" && input.customSplits) {
    return members.map((memberId) => ({
      memberId,
      amount: input.customSplits![memberId] ?? 0,
    }));
  }

  const share = Math.round((input.amount / members.length) * 100) / 100;
  return members.map((memberId, i) => ({
    memberId,
    amount: i === members.length - 1 ? input.amount - share * (members.length - 1) : share,
  }));
}

export function validateSplitTotal(
  amount: number,
  splits: Array<{ amount: number }>,
  splitType: "PERSONAL" | "SHARED" = "SHARED"
) {
  if (splitType === "PERSONAL") return true;
  const total = splits.reduce((sum, s) => sum + s.amount, 0);
  return Math.abs(total - amount) <= 0.02;
}
