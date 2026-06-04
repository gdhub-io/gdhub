# Paddle Integration Guide

## Overview

This document describes the Paddle payment integration for paid vacancy listings in GDHub.

Payments are now handled through a centralized `Payment` table with support for multiple payment types (VACANCY, SUBSCRIPTION, EVENT, COURSE).

## Environment Variables

### Required

- `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` - Public client token for Paddle (required for frontend checkout)
- `PADDLE_API_KEY` - Server-side API key for Paddle (already configured)

Get these from your [Paddle Dashboard](https://dashboard.paddle.com/).

## Features

### 1. Paddle Service

Located in `src/services/paddle/`:

- **index.ts** - Core Paddle initialization and checkout functions
  - `getPaddleInstance()` - Get or initialize Paddle instance
  - `openPaddleCheckout()` - Open Paddle checkout overlay

- **usePaddle.ts** - React hook for using Paddle in components
  - Returns `paddle`, `isLoading`, `error`, and `checkout` function

### 2. API Endpoints

#### POST /api/user/project/vacancy/payment

Creates a payment record for a vacancy listing.

**Request:**
```json
{
  "vacancyId": "vacancy-id-123",
  "rateType": "Hourly" | "OneTime" | "Monthly"
}
```

**Response:**
```json
{
  "id": "payment-id-123",
  "amount": 3,
  "currency": "EUR",
  "status": "PENDING",
  "rateType": "Hourly",
  "payableType": "VACANCY",
  "payableId": "vacancy-id-123",
  "createdAt": "2026-05-30T10:00:00Z",
  "completedAt": null
}
```

#### POST /api/paddle/webhooks

Handles Paddle webhook events. Automatically updates payment status when:
- `transaction.completed` - Updates payment status to COMPLETED and stores Paddle transaction ID

## Database Schema

### Payment Table (New)

Centralized payment table for all payment types:
- `id` (String) - Primary key
- `amount` (Float) - Amount in EUR
- `currency` (String) - Currency code (default: EUR)
- `status` (PaymentStatus) - PENDING, COMPLETED, FAILED, REFUNDED
- `rateType` (PaymentRateType) - Hourly, OneTime, Monthly
- `payableType` (PayableType) - VACANCY, SUBSCRIPTION, EVENT, COURSE
- `payableId` (String) - ID of the related entity (vacancy ID, subscription ID, etc.)
- `paddleTransactionId` (String) - Paddle transaction ID (unique)
- `createdAt` (DateTime) - When payment was created
- `completedAt` (DateTime) - When payment was completed

### TeamVacancy Extensions

Virtual fields added via extensions:
- `vacancy.payments` - Array of Payment records for this vacancy
- `vacancy.paymentStatus` - Current payment status (COMPLETED or null)

## Usage in Components

### VacancyModal Payment Flow

Payment fields are shown in the modal when "Add payment" button is clicked:

```tsx
// Payment is automatically initiated when user clicks "Pay & Publish"
const handleOk = async (asDraft?: { asDraft: boolean }) => {
  // 1. Create or update vacancy
  const response = await createVacancy(payload);
  
  // 2. If payment fields are filled, create Payment record
  if (hasPendingPayment && createdVacancyId) {
    await axios.post("/api/user/project/vacancy/payment", {
      vacancyId: createdVacancyId,
      rateType: formData.paymentRateType,
    });
  }
};
```

## Payment Flow

1. User creates vacancy with title, description, etc.
2. User clicks "Add payment" button to show payment fields
3. User enters payment amount and rate type
4. User clicks "Pay & Publish" button
5. Frontend:
   - Creates/updates vacancy in database
   - Creates Payment record via `POST /api/user/project/vacancy/payment`
   - (Optional) Opens Paddle checkout for payment processing
6. User completes payment in Paddle checkout
7. Paddle sends webhook to `POST /api/paddle/webhooks`
8. Backend updates Payment record with:
   - status: COMPLETED
   - paddleTransactionId: Paddle transaction ID
   - completedAt: current timestamp
9. Vacancy is published and marked as paid

## Price Management

The paid vacancy listing fee is currently **€3 EUR** and can be adjusted in:
- `src/app/api/user/project/vacancy/payment/route.ts` - `PAID_VACANCY_FEE` constant

## Testing

### Sandbox Mode

By default, the integration runs in Paddle's sandbox environment:
- NODE_ENV !== 'production' → sandbox environment
- Use Paddle's test cards for testing payments

### Production Mode

When deploying to production:
- Ensure `NODE_ENV=production`
- Update `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` with production token
- Update `PADDLE_API_KEY` with production API key

## Security

- All payment endpoints require authentication (`withAuth`)
- Webhook signature verification can be added for production
- Custom data is validated and scoped to user's projects
