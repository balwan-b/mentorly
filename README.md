# Mentorly

Mentorly is a full-stack mentor booking app built with Next.js, Convex, and Clerk.

It is structured as a showcase-ready portfolio project with typed backend functions, Clerk-authenticated Convex access, route-level error boundaries, and automated CI checks for linting, type safety, and production builds.

It currently supports:

- sign up and sign in with Clerk
- Convex-backed user records
- mentor and learner profiles on the same account
- public mentor discovery
- session requests between learners and mentors
- mentor availability rules and generated booking slots
- booking accepted requests
- in-app notifications for request and booking updates

## Stack

- Next.js 16 App Router
- React 19
- Convex for database and backend functions
- Clerk for authentication
- Tailwind CSS 4
- TypeScript
- pnpm

## Project Structure

```text
app/                 Next.js routes and pages
components/          Shared UI and feature components
convex/              Convex schema, queries, mutations, and webhook handling
lib/                 Shared constants and helpers
types/               Shared TypeScript types
public/              Static assets
```

## Core Product Flow

1. A user signs in with Clerk.
2. Clerk identity is mapped to a Convex `users` record.
3. The user can maintain both a mentor profile and a learner profile.
4. Active mentor profiles appear on the mentors page.
5. A learner sends a session request to a mentor.
6. The mentor accepts or declines the request.
7. The mentor defines weekly availability and generates slots.
8. The learner books an accepted request using one of those slots.
9. Both sides receive in-app notifications as request and booking state changes.

## Data Model

The main Convex tables are:

- `users`
- `mentorProfiles`
- `learnerProfiles`
- `sessionRequests`
- `availabilityRules`
- `availabilitySlots`
- `bookings`
- `notifications`

See [convex/schema.ts](./convex/schema.ts) for the authoritative schema.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```env
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CONVEX_SITE_URL=

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_JWT_ISSUER_DOMAIN=
CLERK_WEBHOOK_SIGNING_SECRET=

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

```bash
cp .env.example .env.local
```

Notes:

- `CLERK_JWT_ISSUER_DOMAIN` is used by Convex auth configuration.
- `CLERK_WEBHOOK_SIGNING_SECRET` is used by the Clerk webhook handler.
- `NEXT_PUBLIC_CONVEX_URL` is required by the client Convex provider.

## Clerk Setup

In Clerk:

1. Create an application.
2. Create a JWT template named `convex`.
3. Configure the Clerk webhook for user events.
4. Point the webhook to `/webhooks/clerk` on your deployed Convex site.

Convex auth configuration lives in [convex/auth.config.ts](./convex/auth.config.ts).

## Installation

```bash
pnpm install
```

## Local Development

Start the app and Convex together:

```bash
pnpm dev
```

This runs:

- `convex dev`
- `next dev --webpack`

If you want to isolate the frontend and backend while debugging local resource usage:

```bash
pnpm dev:web
pnpm dev:convex
```

If you specifically want the newer Next.js dev engine again:

```bash
pnpm dev:turbo
```

## Quality Checks

Run the full local quality gate:

```bash
pnpm check
```

Lint:

```bash
pnpm lint
```

Typecheck:

```bash
pnpm typecheck
```

Production build:

```bash
pnpm build
```

Start the production server:

```bash
pnpm start
```

If you change Convex schema or function signatures, regenerate Convex types:

```bash
npx convex codegen
```

## Important Files

- [app/layout.tsx](./app/layout.tsx): root app shell and providers
- [components/ConvexClientProvider.tsx](./components/ConvexClientProvider.tsx): Convex client setup
- [convex/schema.ts](./convex/schema.ts): database schema
- [convex/lib/auth.ts](./convex/lib/auth.ts): identity helpers
- [convex/http.ts](./convex/http.ts): Clerk webhook endpoint
- [convex/profiles.ts](./convex/profiles.ts): mentor and learner profile logic
- [convex/sessionRequests.ts](./convex/sessionRequests.ts): request lifecycle
- [convex/availability.ts](./convex/availability.ts): weekly rules and slot generation
- [convex/bookings.ts](./convex/bookings.ts): booking lifecycle
- [convex/notifications.ts](./convex/notifications.ts): notification queries and mutations

## Current Pages

- `/`: landing page
- `/mentors`: public mentor list
- `/mentors/[mentorId]`: mentor detail page and request form
- `/profile`: mentor and learner profile editor
- `/requests`: request inbox for both roles
- `/availability`: mentor scheduling rules
- `/bookings`: booking management
- `/notifications`: notification center
- `/sign-in` and `/sign-up`: Clerk auth pages

## Development Notes

- This repo uses Convex guidelines from `convex/_generated/ai/guidelines.md`.
- Auth-linked user lookup prefers Clerk `tokenIdentifier` for stability.
- Notification unread counts are denormalized onto the `users` table.
- Availability generation updates available slots incrementally instead of rebuilding everything each time.
- Public Convex queries that expose user-specific data enforce ownership checks server-side.
- Request and booking mutations enforce lifecycle transitions server-side instead of relying on the client UI.
- Global loading and error routes are defined in `app/loading.tsx` and `app/error.tsx`.

## Production Readiness Notes

- GitHub Actions runs `pnpm lint`, `pnpm typecheck`, and `pnpm build` on every push and pull request.
- Session requests, bookings, and notifications use bounded list queries to avoid unbounded reads on the hot paths.
- Booking creation re-validates slot ownership, duration, and request-window constraints on the server.
- Clerk webhook deletion cleans up related profiles, availability, requests, bookings, and notifications in batches to avoid transaction-limit failures.
- Availability is stored in the mentor's configured time zone and converted to each viewer's local time for display.

## Status

The app currently passes:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

## Next Improvements

Some reasonable next steps for the product:

- payments and checkout
- richer mentor filtering and sorting
- booking reminders and email notifications
- automated tests for booking and scheduling flows
- deployment documentation
