# 0007 — Clients sign in with Google or an email code; phone is collected, not verified (yet)

**Status:** Accepted · 2026-10-02

## Context
Clients must be identified to confirm a booking. The designs used an SMS code (about KES 0.80 per message, about KES 2.40 per booking with confirmation and reminder). The goal is zero cost per booking.
- WhatsApp outbound messages are paid for every category since 2026-10-01, including replies inside the 24-hour window.
- A zero-cost "Verify with WhatsApp" flow (the client sends us a pre-filled code; inbound messages are free) was chosen first, but Meta developer account creation failed and would block the schedule.

## Options
- **SMS code:** verified phone; costs per message.
- **Verify with WhatsApp (inbound):** verified phone, free; depends on a Meta business account.
- **Google sign-in:** one tap, free, verified email.
- **Email code:** free on a free email-sending tier, verified email.
- **Phone only:** free, nothing verified.

## Decision
v1: clients confirm with **Google sign-in or an email code**, then enter their phone number for the salon. The phone is stored as **unverified** (`clients.phone_verified = false`) and shown that way to the owner.
The login step is built so **"Verify with WhatsApp" can be added later** as a third method that sets `phone_verified = true`, through the existing `confirm_booking` function.

## Consequences
- Zero cost per booking; no dependency on Meta or an SMS provider for launch.
- Someone could enter another person's phone. Mitigations: unverified phones never merge into another person's client record; verified and unverified phones are separate; owners see the "not verified" badge; holds are rate-limited and bot-checked.
- Automated reminders aren't in v1. Owners can tap **Message** to remind a client from their own WhatsApp at no cost.
- Launch needs a free email sender for codes: Supabase's built-in email only reaches the project team. To be decided before launch: Gmail SMTP or a free provider tier.
