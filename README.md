# Waypoint

Group travel planner for friends and family. Plan itineraries, track flights, manage accommodations, split costs, and collaborate on trips — with per-trip privacy and guest access (no account required for v1).

## v1 features

- **Trips** — Create multiple trips with start/end dates and destinations
- **Members** — Per-trip access via invite links; roles (owner / editor / viewer)
- **Guest access** — Join with just a display name; session cookie persists
- **Itinerary** — Day-by-day timeline with activities, meals, transfers
- **Map** — OpenStreetMap view of itinerary and stay locations (add lat/lng manually)
- **Flights** — Manual entry with status tracking (extensible for live APIs later)
- **Accommodations** — Stays with check-in/out, booking refs, links
- **Transfers** — Ground transport between locations
- **Expenses** — Custom or equal splits with simplified “who owes whom”
- **Calendar** — Trip calendar view + `.ics` export
- **Presence** — See when others are viewing the same trip section
- **Activity history** — Audit log of changes for recovery/context
- **Notifications** — In-app notifications on trip updates

## Tech stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS
- **Prisma** + SQLite (local dev) — schema designed for Supabase/Postgres migration
- **Leaflet** + OpenStreetMap (free, no API key)
- **ics** for calendar export

## Getting started

```bash
cd waypoint-travel
npm install
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. Enter your display name
2. Create a trip
3. Click **Invite link** to share with your group
4. Add itinerary, flights, stays, and expenses

## Environment

Copy `.env.example` to `.env`:

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

For Supabase later, switch `prisma/schema.prisma` provider to `postgresql` and set your connection string.

## Roadmap

| Version | Features |
|---------|----------|
| **v1** (now) | Trips, itinerary, map, flights, stays, expenses, calendar, invites, presence, history |
| **v2** | PDF ingest → editable items, email forward inbox, flight price search, offline PWA |
| **v3** | AI plan alternatives, calendar sync, email account connect, payments via Stripe |

## Project structure

```
src/
  app/              # Pages and API routes
  components/       # UI components
  lib/              # DB, auth, calendar, expense logic
prisma/
  schema.prisma     # Data model
```

## API integration slots

Flights include `externalProvider` and `externalFlightId` fields for future live status APIs (FlightAware, AviationStack, etc.).

Users table exists for future email/SSO auth — v1 uses Guest sessions only.

## License

Private / internal use.
