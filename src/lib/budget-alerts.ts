import { createAdminClient } from "@/lib/supabase/admin";
import { notifyBudgetAlert } from "@/lib/web-push";

interface Budget {
  id: string;
  category_id: string | null;
  monthly_limit: number;
  alert_threshold: number;
  categories: { name: string } | null;
}

// Track which alerts have been sent to avoid duplicates
// In production, you might want to store this in the database
const sentAlerts = new Map<string, number>();

/**
 * Check budgets and send push notifications if thresholds exceeded
 * This should be called after transactions are modified
 */
export async function checkAndNotifyBudgetAlerts(householdId: string) {
  const supabase = createAdminClient();

  // Get budgets for household
  const { data: budgets } = await supabase
    .from("budgets")
    .select(
      `
      id,
      category_id,
      monthly_limit,
      alert_threshold,
      categories (name)
    `
    )
    .eq("household_id", householdId);

  if (!budgets || budgets.length === 0) return;

  // Get current month spending
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, category_id")
    .eq("household_id", householdId)
    .gte("date", startOfMonthStr);

  if (!transactions) return;

  // Calculate spending per category
  const spendingByCategory: Record<string, number> = {};
  let totalSpending = 0;

  for (const txn of transactions) {
    totalSpending += Number(txn.amount);
    if (txn.category_id) {
      spendingByCategory[txn.category_id] =
        (spendingByCategory[txn.category_id] || 0) + Number(txn.amount);
    }
  }

  // Get current month key for deduplication
  const monthKey = `${startOfMonth.getFullYear()}-${startOfMonth.getMonth()}`;

  // Check each budget
  for (const budget of budgets as Budget[]) {
    const spent = budget.category_id
      ? spendingByCategory[budget.category_id] || 0
      : totalSpending;

    const percentage = (spent / budget.monthly_limit) * 100;
    const threshold = budget.alert_threshold ?? 80;

    // Only alert if threshold is reached
    if (percentage < threshold) continue;

    const budgetName = budget.category_id
      ? budget.categories?.name || "Category"
      : "Total Household";

    // Create a unique key for this alert
    const alertKey = `${householdId}-${budget.id}-${monthKey}`;
    const lastAlertPercentage = sentAlerts.get(alertKey) || 0;

    // Only send if we've crossed a new threshold (e.g., 80%, 90%, 100%)
    const thresholdCrossed =
      (percentage >= 100 && lastAlertPercentage < 100) ||
      (percentage >= 90 && lastAlertPercentage < 90) ||
      (percentage >= threshold && lastAlertPercentage < threshold);

    if (thresholdCrossed) {
      await notifyBudgetAlert(
        householdId,
        budgetName,
        percentage,
        spent,
        budget.monthly_limit
      );

      // Track that we've sent this alert
      sentAlerts.set(alertKey, Math.floor(percentage));
    }
  }
}
