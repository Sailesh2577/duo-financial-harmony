# Database Schema Documentation

## Overview

Duo uses a PostgreSQL database hosted on Supabase with 9 core tables to manage household finances. The schema implements Row Level Security (RLS) for data protection and uses triggers for automation.

## Architecture Principles

- **UUIDs for Primary Keys**: Globally unique, secure, distributed-system ready
- **Row Level Security**: Users can only access data from their household
- **Automatic Profile Creation**: Trigger creates user profile on signup
- **Decimal Precision**: DECIMAL(10,2) for money (no floating-point errors)
- **Smart Categories**: System categories (global) + custom categories (per-household)
- **Performance Indexes**: Optimized for common query patterns

---

## Tables

### 1. households

Represents a couple's shared financial space.

| Column            | Type        | Constraints                       | Description                                    |
| ----------------- | ----------- | --------------------------------- | ---------------------------------------------- |
| `id`              | UUID        | PRIMARY KEY                       | Unique household identifier                    |
| `name`            | TEXT        | NOT NULL, DEFAULT 'Our Household' | Display name for the household                 |
| `invite_code`     | TEXT        | UNIQUE, NOT NULL                  | Auto-generated join code (e.g., "JOIN-5X9K2A") |
| `created_by`      | UUID        | FK → users(id)                    | User who created the household                 |
| `show_settlement` | BOOLEAN     | NOT NULL, DEFAULT TRUE            | Whether to show settlement feature             |
| `created_at`      | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()           | When household was created                     |
| `updated_at`      | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()           | Last modification timestamp                    |

**Notes:**

- `invite_code` is auto-generated: `'JOIN-' + 6 random uppercase chars`
- One household = one couple (2 users maximum)
- Deleting a household cascades to transactions, goals

**Example Data:**

```
id: 550e8400-e29b-41d4-a716-446655440000
name: "Sailesh & Raven"
invite_code: "JOIN-5X9K2A"
created_by: 123e4567-e89b-12d3-a456-426614174000
```

---

### 2. users

Extends Supabase's `auth.users` with profile data.

| Column         | Type        | Constraints                      | Description                      |
| -------------- | ----------- | -------------------------------- | -------------------------------- |
| `id`           | UUID        | PRIMARY KEY, FK → auth.users(id) | Matches Supabase auth ID         |
| `email`        | TEXT        | NOT NULL                         | User's email address             |
| `full_name`    | TEXT        | NULL                             | Display name                     |
| `avatar_url`   | TEXT        | NULL                             | Profile picture URL (future use) |
| `household_id`       | UUID        | FK → households(id)              | Links to household               |
| `notification_prefs` | JSONB       | DEFAULT (see below)              | Push notification preferences    |
| `created_at`         | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()          | Account creation                 |
| `updated_at`         | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()          | Last profile update              |

**Notification Preferences Default:**

```json
{
  "push_enabled": true,
  "new_transaction": true,
  "toggle_change": true,
  "budget_alert": true
}
```

**Notes:**

- Profile is **auto-created** via trigger when user signs up
- `ON DELETE CASCADE` from auth.users ensures cleanup
- `ON DELETE SET NULL` from households preserves user if household deleted

**Auto-Creation Trigger:**

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
```

When a user signs up, the trigger automatically creates a matching row in `users` table.

---

### 3. categories

Spending classification buckets (system defaults + custom).

| Column         | Type        | Constraints                            | Description                               |
| -------------- | ----------- | -------------------------------------- | ----------------------------------------- |
| `id`           | UUID        | PRIMARY KEY                            | Unique category ID                        |
| `name`         | TEXT        | NOT NULL                               | Category name (e.g., "Groceries")         |
| `icon`         | TEXT        | NULL                                   | Emoji or icon code (e.g., "🛒")           |
| `color`        | TEXT        | NULL                                   | Hex color for UI (e.g., "#4CAF50")        |
| `is_default`   | BOOLEAN     | DEFAULT FALSE                          | TRUE = system category, FALSE = custom    |
| `household_id` | UUID        | FK → households(id), NULL for defaults | Which household owns this (NULL = global) |
| `created_at`   | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                | When category was created                 |

**Unique Constraint:**

- `name` must be unique **per household**
- System categories (`household_id = NULL`) are globally unique
- Custom categories can have same name as system ones within a household

**Default Categories (Seeded):**
| Name | Icon | Color | is_default | household_id |
|------|------|-------|------------|--------------|
| Groceries | 🛒 | #4CAF50 | TRUE | NULL |
| Dining Out | 🍽️ | #FF5722 | TRUE | NULL |
| Transportation | 🚗 | #2196F3 | TRUE | NULL |
| Shopping | 🛍️ | #9C27B0 | TRUE | NULL |
| Bills & Utilities | 💡 | #FFC107 | TRUE | NULL |
| Entertainment | 🎬 | #E91E63 | TRUE | NULL |
| Healthcare | ⚕️ | #00BCD4 | TRUE | NULL |
| Travel | ✈️ | #FF9800 | TRUE | NULL |
| Personal Care | 💇 | #8BC34A | TRUE | NULL |
| Other | 📦 | #607D8B | TRUE | NULL |

**Custom Categories (Implemented in Issue #31):**
Users can create household-specific categories:

```
name: "Baby Expenses"
household_id: 550e8400-e29b-41d4-a716-446655440000
is_default: FALSE
icon: "👶"
color: "#EC4899"
```

**API Endpoints:**
- `POST /api/categories` - Create custom category
- `PUT /api/categories/[id]` - Update custom category
- `DELETE /api/categories/[id]` - Delete custom category (with optional transaction reassignment)

**UI:** `/settings/categories` page with emoji picker and color palette

---

### 4. transactions

Bank transactions from Plaid or manual cash entries.

| Column                 | Type          | Constraints                   | Description                                       |
| ---------------------- | ------------- | ----------------------------- | ------------------------------------------------- |
| `id`                   | UUID          | PRIMARY KEY                   | Unique transaction ID                             |
| `household_id`         | UUID          | NOT NULL, FK → households(id) | Which household owns this                         |
| `user_id`              | UUID          | NOT NULL, FK → users(id)      | Who made the purchase                             |
| `plaid_transaction_id` | TEXT          | UNIQUE, NULL                  | Plaid's ID (prevents duplicates)                  |
| `plaid_account_id`     | TEXT          | NULL                          | Which bank account                                |
| `amount`               | DECIMAL(10,2) | NOT NULL                      | Transaction amount (precise decimal)              |
| `date`                 | DATE          | NOT NULL                      | Transaction date                                  |
| `description`          | TEXT          | NOT NULL                      | Raw bank description (e.g., "AMZN MKTP US\*2H8K") |
| `merchant_name`        | TEXT          | NULL                          | AI-cleaned name (e.g., "Amazon")                  |
| `category_id`          | UUID          | FK → categories(id)           | Assigned category                                 |
| `is_joint`             | BOOLEAN       | NOT NULL, DEFAULT FALSE       | **Core feature:** Shared expense?                 |
| `is_hidden`            | BOOLEAN       | NOT NULL, DEFAULT FALSE       | V1.1: Hide from partner (gifts)                   |
| `source`               | TEXT          | NOT NULL, CHECK               | 'plaid' or 'manual'                               |
| `created_at`           | TIMESTAMPTZ   | NOT NULL, DEFAULT NOW()       | When imported/created                             |
| `updated_at`           | TIMESTAMPTZ   | NOT NULL, DEFAULT NOW()       | Last modification                                 |

**Check Constraint:**

```sql
CHECK (source IN ('plaid', 'manual'))
```

Database rejects any other values.

**Why DECIMAL not FLOAT?**

```javascript
// JavaScript floating point error:
0.1 + 0.2 = 0.30000000004  // ❌ BAD for money!

// DECIMAL is exact:
0.1 + 0.2 = 0.30  // ✅ GOOD
```

**Full Transparency (MVP):**

- Both partners can see ALL transactions by default
- `is_hidden` will be implemented in V1.1 for "Ghost Math" feature

**Example Data:**

```
id: abc123...
household_id: 550e8400...
user_id: 123e4567... (Sailesh)
amount: 45.67
date: 2025-11-26
description: "AMZN MKTP US*2H8KL9"
merchant_name: "Amazon"  ← AI cleaned this
category_id: xyz789... (Shopping)
is_joint: FALSE  ← Personal purchase
is_hidden: FALSE
source: 'plaid'
```

---

### 5. goals

Shared savings targets for the household.

| Column           | Type          | Constraints                   | Description                            |
| ---------------- | ------------- | ----------------------------- | -------------------------------------- |
| `id`             | UUID          | PRIMARY KEY                   | Unique goal ID                         |
| `household_id`   | UUID          | NOT NULL, FK → households(id) | Which household owns this              |
| `name`           | TEXT          | NOT NULL                      | Goal name (e.g., "Robot Vacuum")       |
| `target_amount`  | DECIMAL(10,2) | NOT NULL                      | Savings target                         |
| `current_amount` | DECIMAL(10,2) | NOT NULL, DEFAULT 0           | Current progress                       |
| `deadline`       | DATE          | NULL                          | Optional target date                   |
| `is_completed`   | BOOLEAN       | NOT NULL, DEFAULT FALSE       | Reached target? (triggers confetti 🎉) |
| `created_at`     | TIMESTAMPTZ   | NOT NULL, DEFAULT NOW()       | When goal was created                  |
| `updated_at`     | TIMESTAMPTZ   | NOT NULL, DEFAULT NOW()       | Last progress update                   |

**Progress Calculation:**

```javascript
const progress = (current_amount / target_amount) * 100;
// Example: $350 / $500 = 70%
```

**Example Data:**

```
id: def456...
household_id: 550e8400...
name: "Robot Vacuum"
target_amount: 500.00
current_amount: 350.00  ← 70% complete!
deadline: 2026-01-15
is_completed: FALSE
```

---

## Relationships

```
┌─────────────┐
│ households  │
│  id         │◄────┐
└─────────────┘     │
       ▲            │
       │            │
       │ household_id
       │            │
┌──────┴──────┐     │
│   users     │     │
│  id         │─────┘ created_by
│  household_id
└─────────────┘
       │
       │ user_id
       ▼
┌─────────────┐     ┌─────────────┐
│transactions │────►│ categories  │
│  category_id│     │  id         │
│  household_id────►│  household_id
└─────────────┘     └─────────────┘

┌─────────────┐
│   goals     │
│  household_id────►households.id
└─────────────┘

┌───────────────┐
│linked_accounts│
│         user_id────►users.id
│    household_id────►households.id
└───────────────┘

┌─────────────┐
│   budgets   │
│  household_id────►households.id
│  category_id────►categories.id (optional)
└─────────────┘

┌──────────────────┐
│push_subscriptions│
│          user_id────►users.id
└──────────────────┘
```

**Cascade Rules:**

- Delete household → Deletes transactions, goals, unlinks users
- Delete user → Deletes their transactions, nullifies household.created_by
- Delete category → Nullifies transactions.category_id (doesn't delete transactions)

---

### 6. linked_accounts

Stores Plaid-linked bank accounts for each household.

| Column               | Type        | Constraints                   | Description                            |
| -------------------- | ----------- | ----------------------------- | -------------------------------------- |
| `id`                 | UUID        | PRIMARY KEY                   | Unique linked account ID               |
| `user_id`            | UUID        | NOT NULL, FK → users(id)      | Who linked this account                |
| `household_id`       | UUID        | NOT NULL, FK → households(id) | Which household this belongs to        |
| `plaid_access_token` | TEXT        | NOT NULL                      | Plaid access token (sensitive!)        |
| `plaid_item_id`      | TEXT        | UNIQUE, NOT NULL              | Plaid's item identifier                |
| `institution_name`   | TEXT        | NULL                          | Bank name (e.g., "Chase")              |
| `account_name`       | TEXT        | NULL                          | Account display name                   |
| `account_mask`       | TEXT        | NULL                          | Last 4 digits (e.g., "1234")           |
| `account_type`       | TEXT        | NULL                          | Type: checking, savings, credit, etc.  |
| `status`             | TEXT        | DEFAULT 'active', CHECK       | Status: active, error, reauth_required |
| `error_code`         | TEXT        | NULL                          | Plaid error code if status is error    |
| `last_synced_at`     | TIMESTAMPTZ | NULL                          | When transactions were last fetched    |
| `created_at`         | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | When account was linked                |
| `updated_at`         | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | Last modification timestamp            |

**Notes:**

- `plaid_access_token` is sensitive - never expose to frontend
- `plaid_item_id` is unique to prevent duplicate connections
- `status` helps track connection health (for re-authentication flows)
- One user can link multiple accounts
- Both partners can see all household linked accounts

**Check Constraint:**

```sql
CHECK (status IN ('active', 'error', 'reauth_required'))
```

**Example Data:**

```
id: ghi789...
user_id: 123e4567... (Sailesh)
household_id: 550e8400...
plaid_access_token: access-sandbox-abc123...
plaid_item_id: item-sandbox-xyz789...
institution_name: "Chase"
account_name: "Chase Checking"
account_mask: "4521"
account_type: "checking"
status: "active"
last_synced_at: 2025-12-01T10:30:00Z
```

---

### 7. budgets

Monthly spending limits for household budget management.

| Column            | Type          | Constraints                           | Description                                    |
| ----------------- | ------------- | ------------------------------------- | ---------------------------------------------- |
| `id`              | UUID          | PRIMARY KEY                           | Unique budget ID                               |
| `household_id`    | UUID          | NOT NULL, FK → households(id)         | Which household owns this budget               |
| `category_id`     | UUID          | FK → categories(id), NULL for total   | Category for limit (NULL = total household)    |
| `monthly_limit`   | DECIMAL(10,2) | NOT NULL                              | Maximum spending amount per month              |
| `alert_threshold` | INTEGER       | DEFAULT 80, CHECK 0-100               | Percentage at which to trigger warning alerts  |
| `created_at`      | TIMESTAMPTZ   | NOT NULL, DEFAULT NOW()               | When budget was created                        |
| `updated_at`      | TIMESTAMPTZ   | NOT NULL, DEFAULT NOW()               | Last modification (auto-updated via trigger)   |

**Unique Constraint:**

- `(household_id, category_id)` - Each household can have one budget per category
- NULL `category_id` represents the total household budget

**Check Constraint:**

```sql
CHECK (alert_threshold >= 0 AND alert_threshold <= 100)
```

**Auto-Update Trigger:**

The `updated_at` column is automatically updated via trigger when the row is modified.

```sql
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Example Data:**

```
-- Total household budget
id: abc123...
household_id: 550e8400...
category_id: NULL          ← Total budget (no specific category)
monthly_limit: 1000.00
alert_threshold: 90        ← Alert at 90%

-- Category-specific budget
id: def456...
household_id: 550e8400...
category_id: xyz789...     ← Dining Out category
monthly_limit: 200.00
alert_threshold: 80        ← Default 80%
```

**RLS Policies:**

| Operation | Policy                                     |
| --------- | ------------------------------------------ |
| SELECT    | Users can view their household's budgets   |
| INSERT    | Users can create budgets for their household |
| UPDATE    | Users can update their household's budgets |
| DELETE    | Users can delete their household's budgets |

**Indexes:**

| Index                       | Column(s)    | Purpose                    |
| --------------------------- | ------------ | -------------------------- |
| `idx_budgets_household_id`  | household_id | Find budgets by household  |
| `idx_budgets_category_id`   | category_id  | Find budgets by category   |

---

### 8. settlements

Monthly settlement records for tracking who owes whom after joint expenses.

| Column         | Type          | Constraints                         | Description                                      |
| -------------- | ------------- | ----------------------------------- | ------------------------------------------------ |
| `id`           | UUID          | PRIMARY KEY                         | Unique settlement ID                             |
| `household_id` | UUID          | NOT NULL, FK → households(id)       | Which household this settlement belongs to       |
| `month`        | DATE          | NOT NULL                            | First day of month (e.g., '2025-12-01')          |
| `total_joint`  | DECIMAL(10,2) | NOT NULL                            | Total joint expenses for the month               |
| `user_a_id`    | UUID          | NOT NULL, FK → users(id)            | First user in the settlement                     |
| `user_a_paid`  | DECIMAL(10,2) | NOT NULL                            | How much user_a contributed to joint expenses    |
| `user_b_id`    | UUID          | NOT NULL, FK → users(id)            | Second user in the settlement                    |
| `user_b_paid`  | DECIMAL(10,2) | NOT NULL                            | How much user_b contributed to joint expenses    |
| `settled_at`   | TIMESTAMPTZ   | NULL                                | When settled (NULL = pending, timestamp = done)  |
| `settled_by`   | UUID          | FK → users(id)                      | Who marked it as settled                         |
| `created_at`   | TIMESTAMPTZ   | NOT NULL, DEFAULT NOW()             | When record was created                          |

**Unique Constraint:**

- `(household_id, month)` - Each household can have one settlement per month

**Settlement Logic:**

```
Example: December 2025
- Joint Total: $1,200
- User A (Sailesh) paid: $700
- User B (Raven) paid: $500
- Fair share each: $600

Sailesh paid $100 MORE than fair share
→ Raven owes Sailesh $100

Balance calculation: user_paid - (total_joint / 2)
- balance > 0 = other partner owes you
- balance < 0 = you owe other partner
```

**Example Data:**

```
id: abc123...
household_id: 550e8400...
month: 2025-12-01
total_joint: 1200.00
user_a_id: 123e4567... (Sailesh)
user_a_paid: 700.00
user_b_id: 456e7890... (Raven)
user_b_paid: 500.00
settled_at: 2025-12-13T15:30:00Z
settled_by: 123e4567... (Sailesh marked it settled)
```

**RLS Policies:**

| Operation | Policy                                       |
| --------- | -------------------------------------------- |
| SELECT    | Users can view their household's settlements |
| INSERT    | Users can create settlements for their household |
| UPDATE    | Users can update their household's settlements |

**Indexes:**

| Index                          | Column(s)    | Purpose                      |
| ------------------------------ | ------------ | ---------------------------- |
| `idx_settlements_household_id` | household_id | Find settlements by household |

---

### 9. push_subscriptions

Stores Web Push API subscriptions for push notifications.

| Column       | Type        | Constraints                   | Description                              |
| ------------ | ----------- | ----------------------------- | ---------------------------------------- |
| `id`         | UUID        | PRIMARY KEY                   | Unique subscription ID                   |
| `user_id`    | UUID        | NOT NULL, FK → users(id)      | Which user this subscription belongs to  |
| `endpoint`   | TEXT        | NOT NULL                      | Push service endpoint URL (FCM, etc.)    |
| `p256dh`     | TEXT        | NOT NULL                      | Public encryption key                    |
| `auth`       | TEXT        | NOT NULL                      | Auth secret for encryption               |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW()                 | When subscription was created            |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW()                 | Last update timestamp                    |

**Unique Constraint:**

- `(user_id, endpoint)` - Each user can have one subscription per endpoint (supports multiple devices)

**Notes:**

- Subscriptions are created when user enables push notifications in Settings
- Multiple subscriptions per user are supported (desktop + mobile, multiple browsers)
- Expired/invalid subscriptions (HTTP 410/404) are automatically cleaned up when push fails
- `p256dh` and `auth` are used for Web Push encryption (VAPID)

**Example Data:**

```
id: abc123...
user_id: 123e4567... (Sailesh)
endpoint: "https://fcm.googleapis.com/fcm/send/..."
p256dh: "BNcRdreALRFX..."
auth: "tBHItJI5svbpez..."
```

**RLS Policies:**

| Operation | Policy                                      |
| --------- | ------------------------------------------- |
| SELECT    | Users can view their own subscriptions      |
| INSERT    | Users can create their own subscriptions    |
| UPDATE    | Users can update their own subscriptions    |
| DELETE    | Users can delete their own subscriptions    |

**Indexes:**

| Index                              | Column(s) | Purpose                       |
| ---------------------------------- | --------- | ----------------------------- |
| `idx_push_subscriptions_user_id`   | user_id   | Find subscriptions by user    |

---

## Row Level Security (RLS)

All tables enforce RLS policies. Users can only access data from their household.

### Security Model

**Principle:** _"You can see everything in your household, nothing outside it"_

### Example Policy (transactions):

```sql
CREATE POLICY "Users can view household transactions"
ON public.transactions
FOR SELECT
USING (
  household_id IN (
    SELECT household_id
    FROM public.users
    WHERE id = auth.uid()
  )
);
```

**How it works:**

1. User sends query: `SELECT * FROM transactions`
2. Database checks: "What's this user's household_id?"
3. Invisible WHERE clause added: `WHERE household_id = 'abc123'`
4. User only sees transactions from household `abc123`

### Policy Coverage

| Table              | SELECT            | INSERT             | UPDATE           | DELETE       |
| ------------------ | ----------------- | ------------------ | ---------------- | ------------ |
| households         | ✅ Own            | ✅ Self as creator | ✅ Own           | ✅ Own       |
| users              | ✅ Self + partner | ✅ Self            | ✅ Self          | ✅ Self      |
| transactions       | ✅ All household  | ✅ Self            | ✅ All household | ✅ Own only  |
| goals              | ✅ Household      | ✅ Household       | ✅ Household     | ✅ Household |
| categories         | ✅ Global + own   | ✅ Authenticated   | ✅ Own           | ✅ Own       |
| linked_accounts    | ✅ Household      | ✅ Self            | ✅ Household     | ✅ Own only  |
| budgets            | ✅ Household      | ✅ Household       | ✅ Household     | ✅ Household |
| settlements        | ✅ Household      | ✅ Household       | ✅ Household     | ❌ N/A       |
| push_subscriptions | ✅ Own only       | ✅ Self            | ✅ Own only      | ✅ Own only  |

### Special Case: Household Creation (The "Chicken-and-Egg" Fix)

The `SELECT` policy for the **households** table differs slightly from others to handle onboarding.

**The Problem:**

1. User creates a household (`INSERT`).
2. App tries to return the new row (`SELECT`).
3. Standard policy checks `get_my_household_id()`.
4. User's profile hasn't been linked to the household yet (that happens next), so the check fails and the `INSERT` appears to return NULL.

**The Solution:**
The `households` SELECT policy allows access if you belong to the household **OR** if you are the creator.

```sql
-- households SELECT policy
USING (
  id = get_my_household_id() -- Normal access
  OR
  created_by = auth.uid()    -- Access immediately after creation
);
```

**Key Security Features:**

- ✅ Can't see other households' data
- ✅ Can't create transactions for other users
- ✅ Can't delete partner's transactions
- ✅ BOTH partners can toggle transactions to "Joint"

---

## Helper Functions

### get_my_household_id()

A security definer function that safely retrieves the current user's household_id without triggering RLS recursion.

**Why It Exists:**
RLS policies that query the `users` table to check `household_id` would cause infinite recursion. This function bypasses RLS safely.

```sql
CREATE OR REPLACE FUNCTION public.get_my_household_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT household_id FROM public.users WHERE id = auth.uid()
$$;
```

**Usage in Policies:**

```sql
-- Instead of this (causes recursion):
USING (household_id IN (SELECT household_id FROM users WHERE id = auth.uid()))

-- Use this:
USING (household_id = public.get_my_household_id())
```

**Security:** Safe because it only returns YOUR household_id (uses `auth.uid()` which can't be spoofed).

---

## Performance Indexes

Indexes speed up common queries by 100x.

| Index                           | Table        | Column(s)    | Purpose                    |
| ------------------------------- | ------------ | ------------ | -------------------------- |
| `idx_users_household_id`        | users        | household_id | Find users in household    |
| `idx_transactions_household_id` | transactions | household_id | Fetch household spending   |
| `idx_transactions_user_id`      | transactions | user_id      | Find user's transactions   |
| `idx_transactions_date`         | transactions | date DESC    | Date range queries, charts |
| `idx_transactions_category_id`  | transactions | category_id  | Category breakdowns        |
| `idx_goals_household_id`        | goals        | household_id | Fetch household goals      |
| `idx_categories_household_id`   | categories   | household_id | Custom categories lookup   |
| `idx_budgets_household_id`      | budgets            | household_id | Find budgets by household        |
| `idx_budgets_category_id`       | budgets            | category_id  | Find budgets by category         |
| `idx_settlements_household_id`  | settlements        | household_id | Find settlements by household    |
| `idx_push_subscriptions_user_id`| push_subscriptions | user_id      | Find subscriptions by user       |

**Without indexes:**

```sql
SELECT * FROM transactions WHERE household_id = 'abc123';
-- Scans all 100,000 transactions: 500ms ❌
```

**With indexes:**

```sql
SELECT * FROM transactions WHERE household_id = 'abc123';
-- Jumps directly to 247 relevant rows: 5ms ✅
```

---

## Automation: Auto-Create User Profile

**Trigger Function:**

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**What happens on signup:**

1. User fills out signup form (email, password, name)
2. Supabase Auth creates row in `auth.users`
3. Trigger fires automatically
4. Profile created in `users` table
5. **No manual code needed!** 🎉

---

## Data Types Explained

| Type            | Use Case            | Why This Type?                            |
| --------------- | ------------------- | ----------------------------------------- |
| `UUID`          | IDs                 | Globally unique, secure, distributed-safe |
| `TEXT`          | Names, descriptions | Variable length, no limit                 |
| `DECIMAL(10,2)` | Money               | Precise (no rounding errors)              |
| `DATE`          | Transaction dates   | Day-level precision (no time)             |
| `TIMESTAMPTZ`   | Timestamps          | Time + timezone (handles global users)    |
| `BOOLEAN`       | Flags (is_joint)    | TRUE/FALSE only                           |

**Critical: Money is DECIMAL, not FLOAT**

```sql
-- BAD:
amount FLOAT  -- 45.67 might become 45.66999999

-- GOOD:
amount DECIMAL(10,2)  -- Always exact: 45.67
```

---

## Migration Strategy

### Current: MVP Schema

- 5 tables with full RLS
- Default categories seeded
- Auto-profile creation

### V1.1 Additions (Should Have)

```sql
-- Already have is_hidden column!
-- Will implement "Ghost Math" merchant masking in application logic
```

### V2.0 Additions (Could Have)

```sql
-- Custom categories: Already supported!
ALTER TABLE categories -- No changes needed

-- Spending moods:
ALTER TABLE transactions
ADD COLUMN mood TEXT;

-- Weekly email subscriptions:
CREATE TABLE email_preferences (
  user_id UUID PRIMARY KEY,
  weekly_summary_enabled BOOLEAN DEFAULT TRUE
);
```

---

## Backup & Recovery

**Supabase handles automatic backups:**

- Daily backups (free tier: 7 days retention)
- Point-in-time recovery available

**Manual export:**

```bash
# Export schema
pg_dump -h your-project.supabase.co \
  -U postgres \
  -s duo_db > schema.sql

# Export data
pg_dump -h your-project.supabase.co \
  -U postgres \
  -a duo_db > data.sql
```

---

## Testing Queries

**Get all transactions for a household:**

```sql
SELECT t.*, u.full_name, c.name as category_name
FROM transactions t
JOIN users u ON t.user_id = u.id
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.household_id = 'your-household-id'
ORDER BY t.date DESC;
```

**Calculate household net worth:**

```sql
SELECT
  SUM(amount) as total_spent,
  SUM(CASE WHEN is_joint THEN amount ELSE 0 END) as joint_spending,
  SUM(CASE WHEN NOT is_joint THEN amount ELSE 0 END) as personal_spending
FROM transactions
WHERE household_id = 'your-household-id';
```

**Goal progress:**

```sql
SELECT
  name,
  target_amount,
  current_amount,
  ROUND((current_amount / target_amount) * 100, 2) as progress_percent,
  is_completed
FROM goals
WHERE household_id = 'your-household-id';
```

---

## Schema Version

- **Version:** 1.3.0
- **Created:** November 26, 2025
- **Last Updated:** December 14, 2025
- **Supabase Project:** duo-financial-harmony

**Changelog:**
- v1.3.0: Added `push_subscriptions` table for Web Push notifications, added `notification_prefs` JSONB column to `users`
- v1.2.0: Added `settlements` table for monthly settlement tracking, added `show_settlement` column to `households`
- v1.1.0: Added `budgets` table for spending limits and alerts
- v1.0.0: Initial schema with households, users, transactions, categories, goals, linked_accounts

---

## Notes for Developers

1. **Never bypass RLS** - Always use authenticated Supabase client
2. **Use prepared statements** - Prevent SQL injection
3. **Validate amount precision** - Frontend should format to 2 decimals
4. **Handle trigger failures** - Profile creation could fail if email is missing
5. **Test with multiple households** - Ensure RLS prevents cross-household access

---

## References

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL DECIMAL Type](https://www.postgresql.org/docs/current/datatype-numeric.html)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/trigger-definition.html)
- [Duo PRD](../Duo__The_Financial_Harmony_App.pdf)
