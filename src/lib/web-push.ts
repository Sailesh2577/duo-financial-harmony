import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

// Initialize web-push with VAPID keys
if (
  process.env.VAPID_SUBJECT &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY
) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface NotificationPrefs {
  push_enabled: boolean;
  new_transaction: boolean;
  toggle_change: boolean;
  budget_alert: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  push_enabled: true,
  new_transaction: true,
  toggle_change: true,
  budget_alert: true,
};

/**
 * Get notification preferences for a user
 */
export async function getUserNotificationPrefs(
  userId: string
): Promise<NotificationPrefs> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("notification_prefs")
    .eq("id", userId)
    .single();

  return (data?.notification_prefs as unknown as NotificationPrefs) || DEFAULT_PREFS;
}

/**
 * Get all push subscriptions for a user
 */
export async function getUserSubscriptions(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching subscriptions:", error);
    return [];
  }

  return data || [];
}

/**
 * Get partner's user ID from the same household
 */
export async function getPartnerUserId(
  currentUserId: string,
  householdId: string
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("household_id", householdId)
    .neq("id", currentUserId)
    .single();

  return data?.id || null;
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(amount));
}

/**
 * Send push notification to a specific user
 */
export async function sendPushToUser(
  userId: string,
  payload: NotificationPayload
): Promise<{ success: number; failed: number }> {
  const subscriptions = await getUserSubscriptions(userId);

  if (subscriptions.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload)
      );
      success++;
    } catch (error: unknown) {
      failed++;
      const webPushError = error as { statusCode?: number; message?: string };
      // If subscription is expired/invalid, remove it
      if (
        webPushError.statusCode === 410 ||
        webPushError.statusCode === 404
      ) {
        const supabase = createAdminClient();
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
      console.error(
        `Push failed for subscription ${sub.id}:`,
        webPushError.message
      );
    }
  }

  return { success, failed };
}

/**
 * Notify partner of a new transaction
 */
export async function notifyPartnerNewTransaction(
  actorUserId: string,
  actorName: string,
  householdId: string,
  amount: number,
  merchantName: string
) {
  const partnerId = await getPartnerUserId(actorUserId, householdId);
  if (!partnerId) return;

  const prefs = await getUserNotificationPrefs(partnerId);
  if (!prefs.push_enabled || !prefs.new_transaction) return;

  const formattedAmount = formatCurrency(amount);

  await sendPushToUser(partnerId, {
    title: "New expense added",
    body: `${actorName} added ${formattedAmount} at ${merchantName}`,
    url: "/dashboard",
    tag: "new-transaction",
  });
}

/**
 * Notify partner of a toggle change (Personal <-> Joint)
 */
export async function notifyPartnerToggleChange(
  actorUserId: string,
  actorName: string,
  householdId: string,
  amount: number,
  merchantName: string,
  isNowJoint: boolean
) {
  const partnerId = await getPartnerUserId(actorUserId, householdId);
  if (!partnerId) return;

  const prefs = await getUserNotificationPrefs(partnerId);
  if (!prefs.push_enabled || !prefs.toggle_change) return;

  const formattedAmount = formatCurrency(amount);
  const title = isNowJoint ? "Expense marked Joint" : "Expense marked Personal";
  const status = isNowJoint ? "Joint" : "Personal";

  await sendPushToUser(partnerId, {
    title,
    body: `${actorName} marked ${formattedAmount} ${merchantName} as ${status}`,
    url: "/dashboard",
    tag: "toggle-change",
  });
}

/**
 * Notify both partners of a budget alert
 */
export async function notifyBudgetAlert(
  householdId: string,
  budgetName: string,
  percentage: number,
  currentSpend: number,
  limit: number
) {
  const supabase = createAdminClient();

  // Get both users in household
  const { data: users } = await supabase
    .from("users")
    .select("id")
    .eq("household_id", householdId);

  if (!users || users.length === 0) return;

  const formattedCurrent = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(currentSpend);

  const formattedLimit = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(limit);

  const isExceeded = percentage >= 100;
  const title = isExceeded ? "Budget Exceeded!" : "Budget Alert";
  const emoji = isExceeded ? "🚨" : "⚠️";

  for (const user of users) {
    const prefs = await getUserNotificationPrefs(user.id);
    if (!prefs.push_enabled || !prefs.budget_alert) continue;

    await sendPushToUser(user.id, {
      title: `${emoji} ${title}`,
      body: `${budgetName} spending is at ${percentage.toFixed(0)}% (${formattedCurrent}/${formattedLimit})`,
      url: "/settings",
      tag: `budget-alert-${budgetName.toLowerCase().replace(/\s/g, "-")}`,
    });
  }
}
