# Product Roadmap

## Purpose

This roadmap orders the MVP at a product-milestone level. It is not an implementation backlog or status tracker; use GitHub Issues or Projects for executable tasks and current progress.

The product requirements remain the source of truth for MVP behavior and acceptance criteria. Feature specifications, flows, and the generated API contract must be updated when an implemented milestone changes their documented behavior.

## MVP Outcome

An authenticated player can find a suitable nearby court, request one available fixed slot, and receive a decision from the gym owner. Gym owners can publish and manage venues, courts, availability, and booking requests.

## MVP Milestones

### 1. Account and Access Foundation

Establish the account behavior that every protected feature depends on.

- Player and gym-owner registration, login, logout, session handling, and basic profiles.
- Role-based access and resource ownership checks for player and owner actions.
- Account recovery and session-policy decisions before production release.

Sources: [requirements](requirements.md), [authentication specification](../specs/authentication.md).

### 2. Venue and Court Management

Allow gym owners to create the supply that players will discover and book.

- Manage multiple venues per owner.
- Create and edit courts with a sport, price, duration, and active status.
- Publish only venues that meet their required-information and usable-court rules.

Sources: [requirements](requirements.md), [venue and court management specification](../specs/venue-court-management.md), [owner management flow](../flows/owner-booking-management.md).

### 3. Availability and Fixed Slots

Make each active court reliably bookable on a predictable schedule.

- Configure court-level weekly schedules, slot duration, and date-specific exceptions.
- Generate fixed slots and apply the venue-level booking advance window.
- Preserve existing bookings when owners edit schedules, prices, or court settings.

Sources: [availability specification](../specs/availability.md), [venue and court management specification](../specs/venue-court-management.md).

### 4. Player Discovery

Enable authenticated players to find eligible venues and reach an available court slot.

- Use device location when available, with manual location selection as a required fallback.
- Support location and sport filtering, text search, list results, map results, and venue details.
- Revalidate venue, court, and slot state before the player can create a booking.

Sources: [venue discovery specification](../specs/venue-discovery.md), [player discovery flow](../flows/player-discovery.md).

### 5. Booking Lifecycle

Deliver the core marketplace transaction with correct concurrency and state control.

- Create an atomic `pending` booking that locks one court/date/slot combination.
- Allow owners to approve or reject pending requests and players to cancel their own pending or confirmed bookings.
- Expire pending requests at the slot start, complete confirmed bookings after their end, and retain booking history.

Sources: [booking specification](../specs/booking.md), [booking flow](../flows/booking.md).

### 6. Booking Notifications

Keep both parties informed without allowing notification delivery to control booking state.

- Provide in-app notifications for requests, approvals, rejections, cancellations, and expiries.
- Add push notifications where permission is available.
- Add confirmed-booking reminders after their timing and count are decided.

Sources: [notifications specification](../specs/notifications.md), [booking flow](../flows/booking.md).

### 7. MVP Readiness

Verify the complete journey before treating the MVP as ready for release.

- Exercise the owner setup, discovery, booking, owner decision, cancellation, expiry, and completion paths against their acceptance criteria.
- Verify authorization boundaries, slot-lock concurrency, error recovery, observability, and deployment behavior.
- Keep the generated `/openapi.json` contract and its Scalar documentation aligned with implemented routes; do not create a separately maintained API schema that can drift from it.

Sources: [product requirements](requirements.md), [architecture standard](../ARCHITECTURE.md).

## Milestone Dependencies

```text
Account and access
        ↓
Venue and court management
        ↓
Availability and fixed slots
        ↓
Player discovery
        ↓
Booking lifecycle
        ↓
Booking notifications
        ↓
MVP readiness
```

Each milestone may be split into implementation issues, but a downstream milestone must not weaken the invariants established by an upstream one.

## Later

Consider only after the core discovery-to-booking journey is validated:

- Player-owner chat.
- Online payments, deposits, refunds, and platform commissions.
- Multiple staff roles and permissions.
- Ratings, social features, teams, matchmaking, and tournaments.
- Recurring bookings, dynamic pricing, cancellation penalties, recommendations, and customer-facing AI.

## MVP Boundaries

Payment remains at the venue. The MVP does not require chat, online payment processing, advanced marketplace features, or customer-facing AI.

See [MVP Scope](mvp.md) for the concise scope boundary and [Product Requirements](requirements.md) for the authoritative rules.
