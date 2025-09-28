## BrandFuse Backend

This backend powers the **BrandFuse**, handling report generation, payment processing, and secure delivery of full brand reports. Built using **Elysia**, **Prisma**, and **Stripe**, it is designed for serverless deployment and fast, reliable processing.

---

## Table of Contents

* [Features](#features)
* [Tech Stack](#tech-stack)
* [Getting Started](#getting-started)
* [Environment Variables](#environment-variables)
* [API Endpoints](#api-endpoints)
* [Local Testing](#local-testing)
* [Database](#database)
* [Deployment](#deployment)
* [Future Improvements](#future-improvements)

---

## Features

* **Report Lifecycle**

  * Create a pending report with brand name.
  * Process Stripe payments and generate unique access tokens.
  * Serve full reports only after payment.
* **Security**

  * Each report protected by a **UUID access token**.
  * Webhooks validated with Stripe signature.
* **Stripe Integration**

  * Simple one-time payment flow.
  * Metadata links Stripe sessions to reports.
* **Database**

  * PostgreSQL with Prisma ORM.
  * Stores report status, access token, and full report JSON.
* **Local Development**

  * Supports Docker for local PostgreSQL.
  * Stripe CLI for webhook simulation.
* **Extensible**

  * Easy to add multiple products, subscriptions, or advanced checks.

---

## Tech Stack

* **Backend Framework:** [Elysia](https://elysiajs.com/)
* **ORM:** [Prisma](https://www.prisma.io/)
* **Database:** PostgreSQL (local Docker or Supabase)
* **Payments:** [Stripe Checkout](https://stripe.com/docs/payments/checkout)
* **Runtime:** Bun / Deno

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repo-url>
```

### 2. Install dependencies

```bash
bun install
```

### 3. Start PostgreSQL (Docker)

```bash
docker compose up -d
```

### 4. Run Prisma Migrations

```bash
bunx prisma migrate dev --name init
```

### 5. Start the server

```bash
bun dev
```

---

## Environment Variables

Create a `.env` file:

```env
DATABASE_URL="postgresql://docker:docker@localhost:5432/brandfuse"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..." # optional for local testing
```

---

## API Endpoints

### 1. Start Report

**POST** `/api/reports/start`

Request Body:

```json
{
  "brandName": "Nike"
}
```

Response:

```json
{
  "reportId": "uuid",
  "checkoutUrl": "https://checkout.stripe.com/...",
  "previewData": { ... }
}
```

---

### 2. Stripe Webhook

**POST** `/api/stripe/webhook`

* Processes `checkout.session.completed` events.
* Updates report status to `PAID` and generates `accessToken`.

---

### 3. Get Full Report

**GET** `/api/reports/:accessToken`

Response:

```json
{
  "score": 72,
  "whois": "available",
  "website": "ok",
  "instagram": "ok",
  "twitter": "ok",
  "facebook": "ok",
  "advancedChecks": ["Trademark check", "Auction analysis", "Domain history"]
}
```

* Returns 404 if token is invalid.
* Returns 403 if report is not yet paid.

---

## Local Testing

1. Start server:

```bash
bun dev
```

2. Listen to Stripe webhooks:

```bash
stripe listen --forward-to localhost:3333/api/stripe/webhook
```

3. Trigger test events:

```bash
stripe trigger checkout.session.completed
```

4. Check Prisma Studio to verify reports:

```bash
bunx prisma studio
```

---

## Database

* **Table:** `Report`
* **Fields:**

  * `id` (UUID)
  * `brandName` (string)
  * `status` (`PENDING` | `PAID`)
  * `accessToken` (UUID)
  * `fullReport` (JSON)
  * `createdAt`, `updatedAt`

---

## Future Improvements

* Generate real **full reports** with advanced checks.
* Add caching for free previews.
* Support multiple Stripe products or subscriptions.
* Add logs, error monitoring, and alerting.

---