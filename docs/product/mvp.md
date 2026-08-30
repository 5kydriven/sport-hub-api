# MVP Scope

## Purpose

This MVP validates the core marketplace interaction: authenticated players discover nearby sports venues, request a court booking, and receive a decision from the gym owner.

## Included

### Players

- Register, log in, and maintain a basic profile.
- Discover venues using current location or a manually selected area.
- Search and filter venues by sport and location.
- View venue details, courts, prices, operating hours, and available fixed slots.
- Request one court slot at a time.
- View booking status and history.
- Cancel pending or confirmed bookings.
- Receive booking notifications.
- Pay directly at the venue.

### Gym owners

- Register, log in, and maintain an owner profile.
- Create, edit, and publish multiple venues.
- Create and manage multiple courts for each venue.
- Set each court's sport, price, operating schedule, and slot duration.
- Set a booking advance window per venue.
- Review pending booking requests and approve or reject them.
- View upcoming and historical bookings.

## Booking rules

- Slots are fixed and generated from a court's operating schedule and configured duration.
- A new request is `pending` and immediately locks its court/date/slot combination.
- Exactly one active booking may hold a court/date/slot combination.
- Owners may approve (`pending → confirmed`) or reject (`pending → rejected`) only pending requests.
- A player may cancel a pending or confirmed booking; cancellation releases the slot.
- Owners cannot cancel confirmed bookings.
- Pending bookings expire at the slot start time (`pending → expired`), releasing the slot.
- Confirmed bookings become `completed` after the booked period ends.
- Same-day booking is allowed only when the selected slot has not started and remains available.
- Payment is outside the application; there are no online payments, deposits, refunds, or commissions in this MVP.

## Excluded

- Player-owner chat.
- Online payment processing.
- Multiple staff roles and permissions.
- Social feeds, teams, matchmaking, tournaments, and ratings.
- Advanced recommendation, AI product features, dynamic pricing, recurring bookings, and cancellation penalties.

## Source of truth

Use [vision.md](vision.md) for product intent and [requirements.md](requirements.md) for detailed requirements and acceptance criteria. This document is a concise implementation boundary.
