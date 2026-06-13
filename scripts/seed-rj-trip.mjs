import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

function at(dateStr, time = "00:00") {
  return new Date(`${dateStr}T${time}:00`);
}

async function main() {
  const RJ_TOKEN = "rj-demo-session-token";

  // RJ guest (stable token so the demo session can adopt it)
  const rj = await prisma.guest.upsert({
    where: { sessionToken: RJ_TOKEN },
    update: { displayName: "RJ" },
    create: { displayName: "RJ", sessionToken: RJ_TOKEN },
  });

  // A couple of travel companions
  const maya = await prisma.guest.upsert({
    where: { sessionToken: "maya-demo-session-token" },
    update: { displayName: "Maya" },
    create: { displayName: "Maya", sessionToken: "maya-demo-session-token" },
  });
  const leo = await prisma.guest.upsert({
    where: { sessionToken: "leo-demo-session-token" },
    update: { displayName: "Leo" },
    create: { displayName: "Leo", sessionToken: "leo-demo-session-token" },
  });

  // Avoid duplicate seed trips
  const existing = await prisma.trip.findFirst({ where: { name: "Lisbon Crew Getaway" } });
  if (existing) {
    await prisma.trip.delete({ where: { id: existing.id } });
  }

  const start = "2026-07-10";
  const end = "2026-07-16";

  const trip = await prisma.trip.create({
    data: {
      name: "Lisbon Crew Getaway",
      description: "A week of sun, seafood, and fado with the crew. Day trips to Sintra and Cascais planned.",
      origin: "London, UK",
      destination: "Lisbon, Portugal",
      destinations: JSON.stringify(["Lisbon, Portugal", "Sintra, Portugal", "Cascais, Portugal"]),
      startDate: at(start),
      endDate: at(end),
      coverColor: "#0d9488",
      members: {
        create: [
          { guestId: rj.id, role: "OWNER" },
          { guestId: maya.id, role: "EDITOR" },
          { guestId: leo.id, role: "VIEWER" },
        ],
      },
      invites: {
        create: { token: nanoid(24), role: "EDITOR", label: "Default invite" },
      },
    },
    include: { members: { include: { guest: true } } },
  });

  const ownerMember = trip.members.find((m) => m.guestId === rj.id);
  const mayaMember = trip.members.find((m) => m.guestId === maya.id);

  // Flights
  await prisma.flight.createMany({
    data: [
      {
        tripId: trip.id,
        airline: "TAP Air Portugal",
        flightNumber: "TP1361",
        departureAirport: "LHR",
        arrivalAirport: "LIS",
        departureTime: at(start, "09:25"),
        arrivalTime: at(start, "12:10"),
        status: "SCHEDULED",
        confirmationCode: "RJ7K2P",
        seatInfo: "14A, 14B, 14C",
        costAmount: 189,
        costCurrency: "GBP",
      },
      {
        tripId: trip.id,
        airline: "TAP Air Portugal",
        flightNumber: "TP1362",
        departureAirport: "LIS",
        arrivalAirport: "LHR",
        departureTime: at(end, "19:40"),
        arrivalTime: at(end, "22:20"),
        status: "SCHEDULED",
        confirmationCode: "RJ7K2P",
        seatInfo: "9D, 9E, 9F",
        costAmount: 189,
        costCurrency: "GBP",
      },
    ],
  });

  // Accommodation
  await prisma.accommodation.create({
    data: {
      tripId: trip.id,
      name: "Alfama Terrace Apartment",
      address: "Rua de São Miguel 24, Alfama, Lisbon",
      checkIn: at(start, "15:00"),
      checkOut: at(end, "11:00"),
      bookingRef: "ALF-228841",
      notes: "Rooftop terrace with river views. Key lockbox code sent by host.",
      url: "https://example.com/alfama-terrace",
      costAmount: 980,
      costCurrency: "EUR",
    },
  });

  // Itinerary items
  const days = [
    { date: start, items: [
      { title: "Land & settle in Alfama", type: "TRANSFER", startTime: "12:30", location: "Lisbon Airport (LIS)" },
      { title: "Sunset at Miradouro da Senhora do Monte", type: "ACTIVITY", startTime: "19:30", location: "Miradouro da Senhora do Monte" },
      { title: "Dinner at A Cevicheria", type: "MEAL", startTime: "21:00", location: "Rua Dom Pedro V 129" },
    ]},
    { date: "2026-07-11", items: [
      { title: "Belém Tower & Jerónimos Monastery", type: "ACTIVITY", startTime: "10:00", location: "Belém" },
      { title: "Pastéis de Belém", type: "MEAL", startTime: "13:00", location: "R. de Belém 84-92" },
    ]},
    { date: "2026-07-12", items: [
      { title: "Day trip to Sintra — Pena Palace", type: "ACTIVITY", startTime: "09:00", location: "Sintra" },
      { title: "Quinta da Regaleira", type: "ACTIVITY", startTime: "14:00", location: "Sintra" },
    ]},
    { date: "2026-07-13", items: [
      { title: "Beach day in Cascais", type: "ACTIVITY", startTime: "11:00", location: "Praia da Rainha, Cascais" },
    ]},
    { date: "2026-07-14", items: [
      { title: "Fado night in Alfama", type: "ACTIVITY", startTime: "20:30", location: "Clube de Fado" },
    ]},
  ];

  let sort = 0;
  for (const day of days) {
    for (const item of day.items) {
      await prisma.itineraryItem.create({
        data: {
          tripId: trip.id,
          dayDate: at(day.date),
          title: item.title,
          type: item.type,
          startTime: item.startTime,
          location: item.location,
          sortOrder: sort++,
        },
      });
    }
  }

  // Expenses (shared, split equally)
  async function sharedExpense(title, amount, currency, paidBy, dateStr) {
    const members = [ownerMember, mayaMember, trip.members.find((m) => m.guestId === leo.id)];
    const each = Math.round((amount / members.length) * 100) / 100;
    await prisma.expense.create({
      data: {
        tripId: trip.id,
        title,
        amount,
        currency,
        paidById: paidBy.id,
        expenseDate: at(dateStr),
        splitType: "SHARED",
        splitMode: "EQUAL",
        splits: {
          create: members.map((m) => ({ memberId: m.id, amount: each })),
        },
      },
    });
  }

  await sharedExpense("Alfama Terrace Apartment", 980, "EUR", ownerMember, start);
  await sharedExpense("Group dinner — A Cevicheria", 142, "EUR", mayaMember, start);
  await sharedExpense("Sintra train + palace tickets", 96, "EUR", ownerMember, "2026-07-12");
  await sharedExpense("Tuk-tuk city tour", 75, "EUR", mayaMember, "2026-07-11");

  console.log(`Seeded trip "${trip.name}" (${trip.id}) for RJ with ${trip.members.length} members.`);
  console.log(`RJ guest id: ${rj.id}, session token: ${RJ_TOKEN}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
