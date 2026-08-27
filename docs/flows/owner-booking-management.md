# Gym Owner Booking Management Flow

## Purpose

Define how a gym owner manages their venues, courts, availability, and pending booking requests.

## Venue and court setup

```mermaid
flowchart TD
    A[Owner registers or logs in] --> B[Create or select venue]
    B --> C[Enter venue information and location]
    C --> D[Create court]
    D --> E[Set sport, price, and operating schedule]
    E --> F[Set court slot duration]
    F --> G[Set venue booking advance window]
    G --> H[Publish venue]
    H --> I[Venue becomes discoverable]
```

## Booking review

```mermaid
flowchart TD
    A[Owner receives pending booking notification] --> B[Open booking request]
    B --> C{Booking still pending and slot not started?}
    C -->|No| D[Show current booking state; no owner action]
    C -->|Yes| E[Review player, venue, court, slot, and price]
    E --> F{Approve or reject?}
    F -->|Approve| G[Set booking to confirmed]
    F -->|Reject| H[Set booking to rejected]
    G --> I[Keep slot unavailable and notify player]
    H --> J[Release slot and notify player]
```

## Rules

- An owner may manage multiple venues; each venue may contain multiple courts.
- Each court has its own sport, price, operating schedule, and slot duration.
- The booking advance window belongs to the venue and applies to all of its courts.
- Owners see and act only on bookings associated with venues they manage.
- An owner can approve or reject only `pending` bookings.
- An owner cannot cancel a `confirmed` booking in the MVP.
- A booking that reaches its slot start while still pending becomes `expired`; it cannot be approved or rejected.

## Booking views

| View | Booking states |
|---|---|
| Action required | `pending` |
| Upcoming | `confirmed` |
| History | `completed`, `cancelled`, `rejected`, `expired` |

## Alternate outcomes

| Situation | Expected outcome |
|---|---|
| Venue lacks required information | Keep it unpublished and unavailable in player discovery. |
| Owner changes court duration or schedule | Regenerate future availability according to the updated configuration; never invalidate an existing confirmed booking without an explicit future policy. |
| Booking is no longer pending | Display its current status and hide approval/rejection actions. |
| Player cancels | Release the slot and notify the owner. |
