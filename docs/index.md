# Sport API Documentation

This is the entry point for the product and engineering documentation of the community sports venue discovery and booking platform.

## Product

- [Vision](product/vision.md) - problem, target users, product principles, and MVP direction.
- [Requirements](product/requirements.md) - authoritative MVP behavior and acceptance criteria.
- [MVP scope](product/mvp.md) - concise included and excluded scope.
- [Roadmap](product/roadmap.md) - product-level milestones; use GitHub Issues or Projects for executable work and current status.
- [Discovery](product/discovery.md) - early product research and assumptions.

## Architecture

- [System architecture overview](architecture/overview.md) - system context, product-domain boundaries, and proposed MVP design.
- [Backend architecture standard](ARCHITECTURE.md) - normative implementation rules for the existing Worker API.
- [ADR 001: Booking slot exclusivity](architecture/decisions/001-booking-slot-exclusivity.md) - accepted concurrency and persistence decision for bookings.

## Feature specifications

- [Authentication](specs/authentication.md)
- [Venue and court management](specs/venue-court-management.md)
- [Availability](specs/availability.md)
- [Venue discovery](specs/venue-discovery.md)
- [Booking](specs/booking.md)
- [Notifications](specs/notifications.md)

## Flows

- [Player discovery](flows/player-discovery.md)
- [Booking lifecycle](flows/booking.md)
- [Gym owner booking management](flows/owner-booking-management.md)

## API contract

The API contract is generated from the Hono route schemas at runtime. Use the deployed or local `/openapi.json` endpoint as the canonical machine-readable contract, and `/docs` for its Scalar reference UI. Do not create a hand-maintained endpoint schema that can drift from those routes.

## Operations

- [Deployment runbook](operations/deployment.md) - CI/CD behavior, required production configuration, migrations, recovery, and test strategy.

## Working with this documentation

Before changing a feature, read its specification, relevant flow, the [system architecture overview](architecture/overview.md), and the [backend architecture standard](ARCHITECTURE.md). Update the affected document when an externally visible behavior, flow, API contract, architecture decision, or release procedure changes.
