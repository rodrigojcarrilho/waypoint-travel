import { syncBookingExpense, type BookingExpenseInput } from "./booking-expense";

export type StayExpenseInput = BookingExpenseInput;

export async function syncStayExpense(
  tripId: string,
  accommodation: {
    id: string;
    name: string;
    checkIn: Date;
    costAmount: number | null;
    costCurrency: string | null;
  },
  tracking?: StayExpenseInput | null
) {
  return syncBookingExpense(
    tripId,
    "linkedAccommodationId",
    accommodation.id,
    {
      title: `Stay: ${accommodation.name}`,
      expenseDate: accommodation.checkIn,
      costAmount: accommodation.costAmount,
      costCurrency: accommodation.costCurrency,
    },
    tracking
  );
}
