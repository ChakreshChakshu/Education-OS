# 12 – Notification System

## Purpose

This document defines the notification system architecture for the Education Operating System (EOS).

It establishes an event-driven, channel-agnostic messaging platform for delivering transactional emails, in-app notifications, push notifications, and future messaging integration (SMS, WhatsApp, Slack, Teams) while maintaining multi-tenant isolation, user preference controls, and delivery retry capabilities.

---

# Core Design Principles

- **Event-Driven Delivery:** Business modules publish notification domain events; they never call email or SMS SDKs directly.
- **Unified Notification Model:** Single business notification entity (`Notification`) dispatches to multiple channel deliveries (`NotificationDelivery`).
- **Provider Abstraction:** Delivery channels operate behind decoupled interfaces (`MailProvider`, `PushProvider`).
- **User Preference Enforcement:** User controls per category (`COURSE`, `ASSIGNMENT`, `SECURITY`) and channel (`EMAIL`, `IN_APP`, `PUSH`).
- **Template-Driven Messages:** Versioned HTML/text templates with variable interpolation.
- **Asynchronous Retry Pipeline:** Non-blocking queue processing with exponential backoff retries.

---

# High-Level Architecture

```text
Domain Event (e.g. CoursePublishedEvent)
                  │
                  ▼
         Notification Service
                  │
                  ▼
         Persist Notification Record (notifications)
                  │
                  ▼
     Queue NotificationDeliveryJob (apps/worker)
                  │
                  ▼
      Resolve User Preferences & Category Rules
                  │
    ┌─────────────┼─────────────┬─────────────┐
    ▼             ▼             ▼             ▼
In-App      MailProvider    PushProvider   WhatsApp
Delivery    (Resend/SES)    (FCM/APNS)     (Twilio)
```

---

# 1. Notification Model (`notifications`)

Represents the core business notification intent.

### Table Schema: `notifications`

```sql
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(100) NOT NULL, -- COURSE_PUBLISHED, ASSIGNMENT_DUE, CERTIFICATE_ISSUED
  category        VARCHAR(50) NOT NULL,  -- COURSE, ASSIGNMENT, ASSESSMENT, CERTIFICATE, BILLING, SECURITY, SYSTEM
  title           VARCHAR(255) NOT NULL,
  body            TEXT NOT NULL,
  status          VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, QUEUED, SENT, READ, FAILED
  read_at         TIMESTAMPTZ,
  data_json       JSONB DEFAULT '{}'::jsonb, -- Deep links, entity IDs
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 2. Notification Delivery Model (`notification_deliveries`)

Tracks individual delivery attempts across distinct channels.

### Table Schema: `notification_deliveries`

```sql
CREATE TABLE notification_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel         VARCHAR(50) NOT NULL, -- EMAIL, IN_APP, PUSH, SMS, WHATSAPP, SLACK
  provider        VARCHAR(50) NOT NULL, -- RESEND, SES, SMTP, FCM, TWILIO
  status          VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, DELIVERED, FAILED
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 3,
  last_error      TEXT,
  sent_at         TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 3. User Preference Matrix Schema (`user_notification_preferences`)

Users control their notifications by category and channel.

### Table Schema: `user_notification_preferences`

```sql
CREATE TABLE user_notification_preferences (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid_v7(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category   VARCHAR(50) NOT NULL,
  channel    VARCHAR(50) NOT NULL,
  enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_user_tenant_cat_chan UNIQUE (user_id, tenant_id, category, channel)
);
```

> [!NOTE]
> **Critical Security Override:** Security alerts (password resets, suspicious logins, MFA challenges) bypass user preference checks and are delivered unconditionally.

---

# Channel Driver Interfaces

All email drivers (Resend, Amazon SES, SendGrid, SMTP) implement `MailProvider`:

```javascript
class MailProvider {
  async sendMail({ to, subject, html, text, from, replyTo, attachments }) {}
  async verify() {}
}
```

General `NotificationProvider` contracts govern push and SMS drivers:

```javascript
class NotificationProvider {
  async send(delivery, notification, payload) {}
  async supports(channel) {}
}
```

---

# Template Rendering Engine

Messages use versioned Handlebars/Mustache templates with variable interpolation:

### Example Template: `course_published.email.hbs`
```html
<p>Hello {{firstName}},</p>
<p>Your course <strong>{{courseTitle}}</strong> has been published!</p>
<p><a href="{{courseUrl}}">Click here to view your course.</a></p>
```

---

# In-App Notification Center Features

In-App notifications provide real-time UI alerts within `apps/web`:
- **Unread Counter Badge:** Fast `COUNT(*)` query for `user_id` where `read_at IS NULL`.
- **Mark as Read:** Individual or bulk `UPDATE notifications SET read_at = NOW()`.
- **Deep Linking:** `data_json` payload contains target URL routes (`/courses/01917f8a...`).

---

# Delivery Pipeline & Retry Strategy

```text
Worker Dequeues Delivery Job  ──>  Check User Preference Matrix  ──>  If Disabled ──> Cancel Job
                                                │
                                                ▼
              Update Status SENT  <──  Deliver via MailProvider (Resend/SES)
                      │
                      ▼ (Failure)
              Exponential Backoff Retry (30s ──> 2m ──> 10m) ──> Move to DLQ
```

---

# Recommended Indexes

```sql
-- Notification Indexes
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_tenant_user ON notifications(tenant_id, user_id);

-- Delivery Indexes
CREATE INDEX idx_deliveries_notification_id ON notification_deliveries(notification_id);
CREATE INDEX idx_deliveries_status ON notification_deliveries(status);
```

---

# Architectural Decision Records (ADRs)

---

## ADR-043: Unified Notification Model

### Status
**Accepted**

### Context
Sending messages across multiple channels (email, push, in-app) for a single business event often results in duplicated code and inconsistent logs.

### Decision
Model every business event as a central `Notification` entity that generates separate `NotificationDelivery` rows per channel.

### Benefits
- Single audit log for all business events.
- Independent delivery tracking and retry logic per channel.

---

## ADR-044: Asynchronous Queue Delivery

### Status
**Accepted**

### Context
Calling external email API gateways synchronously blocks Fastify HTTP request handlers.

### Decision
Queue all notification deliveries to background workers (`apps/worker`).

### Benefits
- Ultra-fast API response times.
- Resilient retries during external gateway outages.

---

## ADR-045: Decoupled Mail & Channel Provider Contracts

### Status
**Accepted**

### Context
Switching from SMTP to Resend or Amazon SES should not require changes to domain use cases.

### Decision
Decouple delivery behind `MailProvider` and `NotificationProvider` contracts in `@eos/infra-mail`.

### Benefits
- Complete vendor independence.
- Fast unit testing using mock mail drivers.

---

## ADR-046: Category-Based User Notification Preferences

### Status
**Accepted**

### Context
Users require control over notification volume to prevent email fatigue.

### Decision
Store user preferences granularly by category (`COURSE`, `ASSIGNMENT`, `MARKETING`) and channel (`EMAIL`, `IN_APP`).

### Benefits
- Enhanced user experience and compliance with anti-spam regulations.
- Centralized preference evaluation pipeline.

---

# Guiding Principle

> **Business modules publish notification events—not emails or push messages. A unified Notification model, processed asynchronously through provider abstractions, ensures reliable, scalable, and user-configurable communication across all current and future channels while keeping business logic independent of delivery mechanisms.**
