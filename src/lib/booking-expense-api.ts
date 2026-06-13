import { z } from "zod";

export const expenseTrackingSchema = z.object({
  paidById: z.string(),
  splitType: z.enum(["PERSONAL", "SHARED"]),
  splitMode: z.enum(["EQUAL", "CUSTOM"]).default("EQUAL"),
  memberIds: z.array(z.string()).optional(),
  customSplits: z.record(z.string(), z.number()).optional(),
});

export const bookingCostSchema = {
  costAmount: z.number().positive().optional().nullable(),
  costCurrency: z.string().optional(),
  expenseTracking: expenseTrackingSchema.nullable().optional(),
};

export const bookingCostCreateSchema = {
  costAmount: z.number().positive().optional(),
  costCurrency: z.string().optional(),
  expenseTracking: expenseTrackingSchema.optional(),
};
