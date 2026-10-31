# MaidMatch - API

The server of MaidMatch, a home-cleaning service in France: a REST API for the
booking site and the admin, live notifications over WebSocket, and a
PostgreSQL database through Prisma.

This is one of three projects that work together:

| Project | Role | Main tools |
| --- | --- | --- |
| [maid_match](https://github.com/mansouriorg/maid_match) | Public booking site | Next.js 16, React 19, Tailwind CSS 4, Zustand |
| [maid_match_admin](https://github.com/mansouriorg/maid_match_admin) | Back office for the team | Next.js 16, Socket.IO client |
| [maid_match_serveur](https://github.com/mansouriorg/maid_match_serveur) | REST API and live notifications | NestJS 11, Prisma 7, PostgreSQL |

## Architecture

    src/
      main.ts                 security headers, CORS, input validation
      modules/
        auth/                 login (JWT), the guard on every route, @Public()
        admin/                admin accounts
        service-requests/     bookings: create, price, status, assignment, planning
        maids/                staff directory
        notifications/        live notifications (Socket.IO), e-mail and SMS stubs
        audit/                audit log of admin actions
        settings/             company settings and hourly rate
      prisma/                 database access
    prisma/
      schema.prisma           data model
      migrations/             database changes, applied with prisma migrate deploy
      seed.ts                 creates the first admin from environment values

## Security choices

- Every route needs a valid admin token unless it is marked `@Public()`.
- The server decides the price, the status and the payment of a visitor's
  booking. Only a logged-in admin can set them.
- Inputs are checked and cleaned: unknown fields are dropped, text is trimmed
  and filtered against HTML injection.
- Passwords are hashed with bcrypt. `JWT_SECRET` is required, and there is no
  default admin account.
- Security headers come from helmet, and CORS is limited to the sites listed in
  `CORS_ORIGINS`.
- WebSocket connections need the admin token, and new bookings are announced
  only to logged-in admins.
- Admin changes such as prices and assignments are written to an audit log.
- Request limits per address: 5 login attempts per minute, 10 bookings per
  10 minutes, and 100 requests per minute overall. Behind a reverse proxy, set
  `TRUST_PROXY=1` so each visitor is counted separately.

## Before the first start

1. Copy `.env.example` to `.env` and fill it in. `JWT_SECRET` is required: the
   server refuses to start without it. Use a long random value
   (`openssl rand -base64 48`).
2. Set `CORS_ORIGINS` to the addresses of your sites (comma separated). When it
   is empty, any website may call the API from a browser, and the server prints
   a warning.
3. There is no default admin account. Create the first admin with the seed
   script:

        SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='a-long-password' \
          pnpm exec prisma db seed

## Who can call what

Every route needs a valid admin token (`Authorization: Bearer <token>`, from
`POST /auth/login`) unless it is marked `@Public()` in the code. The public
routes are:

- `POST /auth/login`
- `POST /service-requests` (the booking form of the public site)
- `GET /settings` (a visitor only gets `defaultHourlyRate`; with a token you get
  everything)
- `GET /` (server check)

The WebSocket (live notifications) needs the admin token too: send it as
`auth: { token }` when connecting. A socket without a valid token is refused,
and a new booking is announced only to the connected admins.

To make a new route public, add `@Public()` from
`src/modules/auth/public.decorator.ts`. Do this only for routes that really must
be open.

## Booking rules

- A visitor's booking always starts as REQUESTED with payment PENDING, and the
  server computes the price. Only a logged-in admin can set the status, the
  maid, the price or the payment status when creating a request.
- `endDate` (optional) is the last day of the period the customer is
  available. It is kept only when it comes after the first day.
- `PATCH /service-requests/:id` only accepts `totalPrice` and `paymentStatus`.
- Statuses follow a fixed order. A new request (REQUESTED) can be CONFIRMED,
  REJECTED or CANCELLED. A CONFIRMED one gets a staff member through
  `PATCH /service-requests/:id/assign` (it becomes ASSIGNED) or is CANCELLED.
  An ASSIGNED one becomes COMPLETED or CANCELLED. COMPLETED, CANCELLED and
  REJECTED are final. `PATCH /service-requests/:id/status` refuses any other
  change.
- A staff member is busy only during their assigned jobs. Assigning someone
  whose job overlaps the new one, or who is ON_LEAVE, is refused (409). The
  same person can work several jobs on different days or hours.
- Admins can keep an internal note on a booking (`internalNote` in
  `PATCH /service-requests/:id`, 2000 characters at most). Customers never see
  it, and the audit log records that it changed, not its text.
- When a weekly or every-2-weeks booking is completed, the next one is created
  automatically: same Paris time 7 or 14 days later (clock changes included),
  same customer, options, price and note, payment PENDING. The same person is
  kept if they are free then; otherwise the new job waits as CONFIRMED.

## Data model

- `ServiceRequest`: a booking (customer, home, first day and time, last day of
  the period, duration, status, price, payment, assigned staff member).
- `Maid`: a staff member (skills, languages, experience, rating, availability).
- `Admin`, `AuditLog`, `Notification` and `Settings`.

## Run it locally

Requirements: Node.js 24.22.1 or newer (`nvm use` picks version 24 from
`.nvmrc`), pnpm 10, and PostgreSQL.

    cp .env.example .env        # then fill in DATABASE_URL and JWT_SECRET
    pnpm install
    pnpm exec prisma generate
    pnpm exec prisma migrate deploy
    pnpm run start:dev

The API listens on http://localhost:3000. Create the first admin as described
in "Before the first start".

## Tests and checks

    pnpm exec jest
    pnpm exec eslint "{src,apps,libs,test}/**/*.ts"
    pnpm exec tsc --noEmit -p tsconfig.json
    pnpm run build

The 34 unit tests use small fakes instead of a database, so they run anywhere in
a few seconds. They cover the booking rules, the login guard and the public
routes, the JWT strategy, the WebSocket login, the settings, admin passwords
and the audit log. (`pnpm run lint` also fixes files; the command above only
reports.)

## Deploy

Use Node.js 24.22.1 or newer. Set the same values as in `.env.example` on the
server, with `CORS_ORIGINS` listing your real sites and `TRUST_PROXY=1` behind
a reverse proxy, then:

    pnpm install --frozen-lockfile
    pnpm exec prisma generate
    pnpm exec prisma migrate deploy
    pnpm run build
    pnpm run start:prod

## Dependencies

pnpm only installs package versions that are at least 14 days old
(`minimumReleaseAge` in `pnpm-workspace.yaml`). This protects against a
malicious version being published and installed before anyone notices. A
security fix that cannot wait is listed by name under
`minimumReleaseAgeExclude` and pinned to an exact version in `overrides`.
