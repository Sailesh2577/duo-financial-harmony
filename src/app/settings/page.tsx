import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BudgetSettings } from "@/components/budget-settings";
import { HouseholdSettings } from "@/components/household-settings";

export default async function SettingsPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Get user profile with household
  const { data: userProfile } = await supabase
    .from("users")
    .select("household_id")
    .eq("id", user.id)
    .single();

  if (!userProfile?.household_id) {
    redirect("/onboarding");
  }

  // Get household info
  const { data: household } = await supabase
    .from("households")
    .select("name, show_settlement")
    .eq("id", userProfile.household_id)
    .single();

  // Get all categories (for dropdown)
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .or(`household_id.is.null,household_id.eq.${userProfile.household_id}`)
    .order("name");

  // Get existing budgets
  const { data: budgets } = await supabase
    .from("budgets")
    .select(
      `
      *,
      categories (
        id,
        name,
        icon,
        color
      )
    `
    )
    .eq("household_id", userProfile.household_id);

  // Get current month spending by category
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, category_id, is_joint")
    .eq("household_id", userProfile.household_id)
    .gte("date", startOfMonthStr);

  // Calculate spending per category
  const spendingByCategory: Record<string, number> = {};
  let totalSpending = 0;

  transactions?.forEach((txn) => {
    totalSpending += Number(txn.amount);
    if (txn.category_id) {
      spendingByCategory[txn.category_id] =
        (spendingByCategory[txn.category_id] || 0) + Number(txn.amount);
    }
  });

  return (
    <div className="space-y-8">
      <HouseholdSettings
        householdName={household?.name || "Your Household"}
        showSettlement={household?.show_settlement ?? true}
      />
      <BudgetSettings
        categories={categories || []}
        existingBudgets={budgets || []}
        spendingByCategory={spendingByCategory}
        totalSpending={totalSpending}
      />
    </div>
  );
}
