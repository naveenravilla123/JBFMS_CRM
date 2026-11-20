# JBFMS CRM

Responsive, browser-based **Facility Management CRM MVP** for JB Facilities Management Service.

**This repository contains a working client-side prototype, not a production multi-user CRM.** Demo records are stored in browser `localStorage`. Do not enter actual customer or payment information until a secured backend, authentication, backups and access controls are implemented.

## Quick start

Requirements: modern browser and Python 3 (or any static HTTP server).

```bash
git clone https://github.com/naveenravilla123/JBFMS_CRM.git
cd JBFMS_CRM
npm run dev
# Open http://localhost:4173
```

No npm dependencies or build step are required. Open the app using an HTTP server because ES module imports may not work via `file://`.

### Run business-rule tests

```bash
npm test
npm run check
```

## What works in this MVP

- Responsive desktop/tablet/mobile navigation and business dashboard with live local aggregates
- Create and edit customers; duplicate phone detection and booking history counts
- Create/update enquiries, follow-up dates and statuses
- Create/edit services, category, staffing, duration, package pricing and service-specific checklists
- Create/edit bookings with customer, service, package, schedule, team, service address, discount and notes
- Booking status lifecycle, team scheduling and same-team overlapping booking prevention
- Employee/team directory and assignment of teams to bookings
- Task checklist, supervisor quality approval, customer confirmation and completion gating
- Record cash/UPI/bank/card/online payments, refunds, booking expenses and job profitability
- Invoice print preview (not a statutory GST invoice)
- Complaints and customer feedback
- Revenue/status reporting and CSV export
- JSON backup/import and reset to demo data

**Demo prices, phone numbers and booking records are fictional.**

## Mapping the requested 20-point design

| # | Requirement | Current prototype |
|---|---|---|
| 1 | Business flowchart | Documented workflow below |
| 2 | CRM navigation | Responsive sidebar and modules |
| 3 | Services and packages | Configurable service and pricing records |
| 4 | Customer management | Create, edit and customer booking counts |
| 5 | Enquiry management | Manage enquiries and conversion status |
| 6 | Booking creation | Create/edit booking form |
| 7 | Booking lifecycle | Configurable operational status updates |
| 8 | Booking detail page | Service details, timeline/progress, financial summary |
| 9 | Employee and team management | Employee/team management |
| 10 | Daily scheduling calendar | Date-based team schedule and overlap checks |
| 11 | Employee mobile UI | Responsive booking/checklist interface; dedicated worker login pending |
| 12 | Quality check | Checklist, supervisor/customer confirmation |
| 13 | Billing and profitability | Payments, refunds, expenses, totals, print invoice |
| 14 | Customer support | Complaints and feedback |
| 15 | Owner dashboard | Live KPIs from local data |
| 16 | Database design | Domain model in `src/data.js`; production database pending |
| 17 | User roles | Role selection stub; authorization **not enforced** |
| 18 | Automation | Lifecycle/business-rule checks; notifications pending |
| 19 | Development priorities | Roadmap in this README |
| 20 | Overall CRM architecture | Integrated client-side MVP |

## Business process

```text
Customer enquiry OR direct booking
    → Select service and package
    → Confirm customer, address, price, date and time
    → Assign team (prevent scheduling conflicts)
    → Employee performs service checklist
    → Supervisor quality check + customer confirmation
    → Mark service completed
    → Record payments and expenses
    → Close after payment is settled
    → Capture customer feedback / resolve complaints
```

## Project structure

```text
index.html           Responsive application shell
src/styles.css       Layout and mobile styles
src/app.js           Application screens and browser interaction
src/data.js          Seed data, domain rules and financial functions
src/data.test.mjs    Node built-in test runner unit tests
.github/workflows/ci.yml
```

## Development roadmap

1. **Production foundations:** Next.js/React frontend (or retain this UI and migrate incrementally), Node API, PostgreSQL/Prisma, audit records, session auth and RBAC.
2. **Data and correctness:** multi-tenant isolation, server-side validations, transactions for allocations/payments, customer/address history and migration tooling.
3. **Field operations:** employee role-based mobile PWA, attendance, GPS consent and check-in, before-and-after photos with secure upload, offline-safe checklist.
4. **Billing:** GST invoice numbering and tax configuration, payment gateway, reconciliation, credit notes and refunds.
5. **Integration and automation:** website booking API, WhatsApp notifications, reminders, service quality/complaint SLA rules, background worker and reporting.
6. **Production readiness:** backups, logging, rate limiting, tests, accessibility, secure hosting and business acceptance testing.

### Deployment

Static deployment works on any hosting provider supporting HTML/CSS/JS. Configure the site root to serve `index.html`; no framework build command is required.

For client demos, deploy to GitHub Pages or a static host. For customer production use, implement the server-side roadmap first.
