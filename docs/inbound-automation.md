# JBFMS inbound booking automation

This addition provides an **inbound gateway and review inbox** for the existing CRM prototype.

## Channels and behavior

| Source | How it arrives | Result |
| --- | --- | --- |
| Website | Server-to-server `POST /api/intake/website` | Structured inbound request; complete requests are marked booking-ready |
| WhatsApp Business | Meta webhook `POST /api/meta/webhook` | Incoming customer message saved as new enquiry |
| Instagram Professional | Meta webhook `POST /api/meta/webhook` | Instagram direct message saved as new enquiry |
| Facebook Page | Meta webhook `POST /api/meta/webhook` | Page direct message saved as new enquiry |
| Phone / walk-in | Existing New Enquiry / New Booking forms | Manually created record |

The CRM **Inbound Inbox** has a secure token input, source filter, received timestamps, imported status and conversion buttons. Website requests with a matching CRM service and complete address/date/time can be converted to a local booking. Other messages become enquiries for staff follow-up.

**Important prototype limitation:** The webhook server persists events in `data/inbound.json`, while the current CRM stores bookings and customers in the browser. The admin must open the inbox, enter a token, and import the events; therefore cross-device automatic creation of shared bookings is NOT yet implemented. This needs the planned PostgreSQL backend and authenticated multi-user APIs. Do not deploy as a customer production system.

## Run

Requires Node.js 22 or newer.

```bash
cp .env.example .env
# Edit .env with your own long secrets.
node --env-file=.env server/index.js
# Open http://127.0.0.1:4173
npm test
```

For actual webhooks, deploy the Node server behind **HTTPS** (e.g. with your provider's reverse proxy). Configure `HOST=0.0.0.0` if needed for the host/container; enforce HTTPS, access controls, rate limits, and secrets management externally.

The server deliberately does not enable CORS. Submit website forms through a trusted website backend/serverless function; **never embed WEBSITE_API_KEY or ADMIN_API_TOKEN in customer-side JavaScript**.

## Website integration

Backend-only HTTP request:

```bash
curl -X POST https://YOUR-CRM-HOST/api/intake/website \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: YOUR_WEBSITE_API_KEY' \
  -d '{
    "submissionId": "jbfms-site-form-unique-123",
    "name": "Example Customer",
    "phone": "9876543210",
    "email": "customer@example.com",
    "service": "2 BHK Cleaning",
    "package": "Luxury",
    "address": "Nellore, Andhra Pradesh",
    "date": "2026-12-01",
    "time": "09:30",
    "message": "Please call at arrival"
  }'
```

Expected response: `202 {"received":true,"added":1}`; retries with the same `submissionId` return `added:0`. Send a unique immutable event ID from the website for deduplication. Service name must match one of the CRM services exactly for booking conversion; names are matched case-insensitively.

For incomplete website forms, create an inbound enquiry rather than inventing a booking time or customer address.

## Meta setup (WhatsApp, Instagram, Facebook)

1. Create/configure a Meta developer app, register a callback URL ending in `/api/meta/webhook`, and set `META_VERIFY_TOKEN` to the same token entered in Meta.
2. Configure `META_APP_SECRET` from the app credentials. The server validates `X-Hub-Signature-256` using an HMAC of the **raw request bytes**.
3. Connect the authorized WhatsApp Business Account, Instagram professional account, and Facebook Page; configure the appropriate subscriptions and permissions for each channel.
4. Subscribe only to the relevant incoming message webhooks and test from an external account. Meta webhook event structures and permissions may vary by app/account; verify the real payload before enabling production use.

The receiver intentionally ignores outbound echo messages, delivery receipts and status-only WhatsApp notifications. Social platform sender IDs are not equivalent to phone numbers; an Instagram or Facebook sender is kept as a platform identifier until the customer provides their details.

The code **does not** automatically reply to customers, scrape social media, or fetch private messages without account authorization.

## Admin API

```
GET   /api/health
GET   /api/meta/webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
POST  /api/meta/webhook                    (X-Hub-Signature-256 required)
POST  /api/intake/website                 (x-api-key required)
GET   /api/inbound                        (Authorization: Bearer ADMIN_API_TOKEN)
PATCH /api/inbound/:id                    (Authorization: Bearer ADMIN_API_TOKEN)
```

PATCH body is `{"status":"New|Reviewing|Converted|Closed"}`.

## Security and production next steps

- Webhooks are **server-side** and signature-verified; never accept unauthenticated Meta messages.
- External event IDs dedupe delivery retries. Payloads have a 128 KiB maximum size.
- Inbox APIs use an admin token, stored only in memory by the CRM UI.
- Replace file persistence and browser localStorage with a transactional shared database and signed-in users.
- Build an actual lead-to-booking workflow with validation of package, service area, available staff and time slots.
- Add consent/privacy policy, per-channel retention, audit logs and staff permissions.
- Add Meta webhook subscription renewal/monitoring, delivery retries and alerts.
- Add anti-spam/rate limits at reverse proxy/WAF and a service-id mapping from the public website.
- Add automatic acknowledgements via approved WhatsApp templates and messaging APIs *after* customer opt-in and rules are confirmed.

