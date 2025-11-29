# Database Schema Documentation

## Overview

Duo uses a PostgreSQL database hosted on Supabase with 5 core tables to manage household finances. The schema implements Row Level Security (RLS) for data protection and uses triggers for automation.

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

| Column        | Type        | Constraints                       | Description                                    |
| ------------- | ----------- | --------------------------------- | ---------------------------------------------- |
| `id`          | UUID        | PRIMARY KEY                       | Unique household identifier                    |
| `name`        | TEXT        | NOT NULL, DEFAULT 'Our Household' | Display name for the household                 |
| `invite_code` | TEXT        | UNIQUE, NOT NULL                  | Auto-generated join code (e.g., "JOIN-5X9K2A") |
| `created_by`  | UUID        | FK → users(id)                    | User who created the household                 |
| `created_at`  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()           | When household was created                     |
| `updated_at`  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()           | Last modification timestamp                    |

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
| `household_id` | UUID        | FK → households(id)              | Links to household               |
| `created_at`   | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()          | Account creation                 |
| `updated_at`   | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()          | Last profile update              |

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

**V2.0 Custom Categories:**
Users will be able to create household-specific categories:

```
name: "Baby Expenses"
household_id: 550e8400-e29b-41d4-a716-446655440000
is_default: FALSE
```

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
```

**Cascade Rules:**

- Delete household → Deletes transactions, goals, unlinks users
- Delete user → Deletes their transactions, nullifies household.created_by
- Delete category → Nullifies transactions.category_id (doesn't delete transactions)

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

| Table        | SELECT            | INSERT             | UPDATE           | DELETE       |
| ------------ | ----------------- | ------------------ | ---------------- | ------------ |
| households   | ✅ Own            | ✅ Self as creator | ✅ Own           | ✅ Own       |
| users        | ✅ Self + partner | ✅ Self            | ✅ Self          | ✅ Self      |
| transactions | ✅ All household  | ✅ Self            | ✅ All household | ✅ Own only  |
| goals        | ✅ Household      | ✅ Household       | ✅ Household     | ✅ Household |
| categories   | ✅ Global + own   | ✅ Authenticated   | ✅ Own           | ✅ Own       |

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

- **Version:** 1.0.0 (Hybrid Schema)
- **Created:** November 26, 2025
- **Last Updated:** November 26, 2025
- **Supabase Project:** duo-financial-harmony

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
