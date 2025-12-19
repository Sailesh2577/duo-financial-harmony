import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import LogoutButton from "@/components/logout-button";
import { PlaidLinkButton } from "@/components/plaid-link-button";
import { LinkedAccountsList } from "@/components/linked-accounts-list";
import { SyncTransactionsButton } from "@/components/sync-transactions-button";
import { FilteredTransactionsList } from "@/components/filtered-transactions-list";
import { AddTransactionButton } from "@/components/add-transaction-button";
import { SpendingSummaryCards } from "@/components/spending-summary-cards";
import { RealtimeProvider } from "@/components/realtime-provider";
import { BudgetAlertProvider } from "@/components/budget-alert-provider";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { Settings, Scale } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile with household info
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, household_id")
    .eq("id", user.id)
    .single();

  // Check onboarding status separately (column may not exist yet)
  const { data: onboardingData } = await supabase
    .from("users")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .single();

  const showOnboarding = !onboardingData?.onboarding_completed_at;

  if (!profile?.household_id) {
    redirect("/onboarding");
  }

  // Get household details
  const { data: household } = await supabase
    .from("households")
    .select("name, invite_code, show_settlement")
    .eq("id", profile.household_id)
    .single();

  // Get household members
  const { data: members } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("household_id", profile.household_id);

  // Get linked bank accounts for this household
  const { data: linkedAccounts } = await supabase
    .from("linked_accounts")
    .select("*")
    .eq("household_id", profile.household_id)
    .order("created_at", { ascending: false });

  // Get transactions for this household
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("household_id", profile.household_id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500); // ← CHANGED FROM 50 TO 500

  // Get categories for transaction display
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .or(`is_default.eq.true,household_id.eq.${profile.household_id}`);

  // Calculate spending summaries for current month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

  // Get current month's transactions for calculations
  const { data: monthlyTransactions } = await supabase
    .from("transactions")
    .select("amount, user_id, is_joint, category_id")
    .eq("household_id", profile.household_id)
    .gte("date", startOfMonthStr);

  // Calculate spending totals
  const mySpending = (monthlyTransactions || [])
    .filter((t) => t.user_id === user.id && !t.is_joint)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const partnerSpending = (monthlyTransactions || [])
    .filter((t) => t.user_id !== user.id && !t.is_joint)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const jointSpending = (monthlyTransactions || [])
    .filter((t) => t.is_joint)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Calculate total spending for budget alerts
  const totalSpending = mySpending + partnerSpending + jointSpending;

  // Calculate spending by category for budget alerts
  const spendingByCategory: Record<string, number> = {};
  (monthlyTransactions || []).forEach((t) => {
    if (t.category_id) {
      spendingByCategory[t.category_id] =
        (spendingByCategory[t.category_id] || 0) + Number(t.amount);
    }
  });

  // Fetch budgets for the household
  const { data: rawBudgets } = await supabase
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
    .eq("household_id", profile.household_id);

  // Transform data: Convert null alert_threshold to default (80)
  const budgets = (rawBudgets || []).map((b) => ({
    ...b,
    alert_threshold: b.alert_threshold ?? 80,
  }));

  // Find total budget (category_id is null)
  const totalBudgetData = budgets?.find((b) => b.category_id === null);
  const totalBudget = totalBudgetData
    ? {
        limit: Number(totalBudgetData.monthly_limit),
        threshold: totalBudgetData.alert_threshold ?? 80,
      }
    : null;

  // Joint budget is separate from total - only show if explicitly set
  const jointBudget = null;

  // Check if current month is already settled
  const currentMonthKey = startOfMonthStr;
  const { data: currentMonthSettlement } = await supabase
    .from("settlements")
    .select("settled_at")
    .eq("household_id", profile.household_id)
    .eq("month", currentMonthKey)
    .single();

  const isCurrentMonthSettled = !!currentMonthSettlement?.settled_at;

  // Calculate settlement preview for dashboard widget
  const myJointContribution = (monthlyTransactions || [])
    .filter((t) => t.is_joint && t.user_id === user.id)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const fairShare = jointSpending / 2;
  const settlementBalance = myJointContribution - fairShare;

  // Get partner info
  const partner = members?.find((m) => m.id !== user.id);
  const partnerCount = (members?.length || 1) - 1;
  const hasPartner = partnerCount > 0;
  const hasLinkedAccounts = linkedAccounts && linkedAccounts.length > 0;

  return (
    <RealtimeProvider householdId={profile.household_id}>
      <BudgetAlertProvider
        budgets={budgets || []}
        spendingByCategory={spendingByCategory}
        totalSpending={totalSpending}
      >
        <OnboardingProvider
          showOnboarding={showOnboarding}
          hasPartner={hasPartner}
        >
          <div className="min-h-screen bg-slate-50">
          {/* Header with Navigation */}
          <header className="bg-white border-b border-slate-200">
            <div className="max-w-4xl mx-auto px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    {household?.name || "Dashboard"}
                  </h1>
                  <p className="text-sm text-slate-500">
                    {partnerCount === 0
                      ? "Waiting for your partner to join"
                      : `${members?.length} members`}
                  </p>
                </div>
                <LogoutButton />
              </div>

              {/* Navigation Menu */}
              <nav className="flex gap-6 mt-4 border-t border-slate-100 pt-4">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-1"
                >
                  Dashboard
                </Link>
                <span className="text-sm text-slate-400 cursor-not-allowed">
                  Transactions
                </span>
                <span className="text-sm text-slate-400 cursor-not-allowed">
                  Goals
                </span>
                {(household?.show_settlement ?? true) && (
                  <Link
                    href="/settlement"
                    className="text-sm font-medium text-slate-600 hover:text-slate-900 pb-1 flex items-center gap-1"
                  >
                    <Scale className="h-4 w-4" />
                    Settlement
                  </Link>
                )}
                <Link
                  href="/settings"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 pb-1 flex items-center gap-1"
                  data-onboarding="settings"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </nav>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Spending Summary Cards */}
            <div data-onboarding="summary-cards">
              <SpendingSummaryCards
              mySpending={mySpending}
              partnerSpending={partnerSpending}
              jointSpending={jointSpending}
              partnerName={partner?.full_name || null}
              hasPartner={partnerCount > 0}
              totalBudget={totalBudget}
              jointBudget={jointBudget}
              settlementPreview={
                partnerCount > 0 &&
                jointSpending > 0 &&
                (household?.show_settlement ?? true) &&
                !isCurrentMonthSettled
                  ? {
                      balance: settlementBalance,
                      partnerName:
                        partner?.full_name?.split(" ")[0] ||
                        partner?.email?.split("@")[0] ||
                        "Partner",
                    }
                  : null
              }
            />
            </div>

            {/* Invite Partner Card - Only show if no partner yet */}
            {partnerCount === 0 && (
              <Card className="border-blue-200 bg-blue-50" data-onboarding="invite-partner">
                <CardHeader>
                  <CardTitle className="text-blue-900">
                    📨 Invite Your Partner
                  </CardTitle>
                  <CardDescription className="text-blue-800">
                    Share this code with your partner so they can join your
                    household:
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-white border border-blue-300 rounded-md p-4 text-center">
                    <p className="text-2xl font-mono font-bold tracking-wider text-blue-600">
                      {household?.invite_code}
                    </p>
                  </div>
                  <p className="text-xs text-blue-700 mt-3 text-center">
                    They can enter this code at signup or on the join page
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Bank Connection Card */}
            <Card>
              <CardHeader>
                <CardTitle>🏦 Bank Connection</CardTitle>
                <CardDescription>
                  {hasLinkedAccounts
                    ? "Manage your connected bank accounts"
                    : "Link your bank account to automatically import transactions"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Buttons Row */}
                <div className="flex gap-3">
                  <PlaidLinkButton />
                  {hasLinkedAccounts && <SyncTransactionsButton />}
                </div>

                {/* Show linked accounts if any */}
                {hasLinkedAccounts && (
                  <div className="pt-4 border-t">
                    <LinkedAccountsList
                      accounts={linkedAccounts}
                      currentUserId={user.id}
                      householdMembers={members || []}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Household Members */}
            <Card>
              <CardHeader>
                <CardTitle>Household Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {members?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-md"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {(member.full_name || member.email)?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {member.full_name || "No name set"}
                        {member.id === user.id && (
                          <span className="text-xs text-slate-500 ml-2">
                            (You)
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-slate-500">{member.email}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card data-onboarding="transactions">
              <CardHeader>
                <CardTitle>Transactions</CardTitle>
                <CardDescription>
                  Search and filter your spending history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<FiltersSkeleton />}>
                  <FilteredTransactionsList
                    transactions={transactions || []}
                    categories={categories || []}
                    currentUserId={user.id}
                    householdMembers={members || []}
                  />
                </Suspense>
              </CardContent>
            </Card>
          </main>

          {/* Floating Action Button for Adding Transactions */}
          <AddTransactionButton />
        </div>
        </OnboardingProvider>
      </BudgetAlertProvider>
    </RealtimeProvider>
  );
}

// ↓↓↓ ADD THIS: Loading skeleton for filters ↓↓↓
function FiltersSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-10 bg-slate-100 rounded-md" />
      <div className="flex gap-2">
        <div className="h-9 w-32 bg-slate-100 rounded-md" />
        <div className="h-9 w-32 bg-slate-100 rounded-md" />
        <div className="h-9 w-24 bg-slate-100 rounded-md" />
        <div className="h-9 w-28 bg-slate-100 rounded-md" />
      </div>
      <div className="h-5 w-48 bg-slate-100 rounded-md" />
    </div>
  );
}
