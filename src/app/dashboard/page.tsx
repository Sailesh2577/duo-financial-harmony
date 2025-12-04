import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import { PlaidLinkButton } from "@/components/plaid-link-button";
import { LinkedAccountsList } from "@/components/linked-accounts-list";
import { SyncTransactionsButton } from "@/components/sync-transactions-button";
import { TransactionsList } from "@/components/transactions-list";
import { AddTransactionButton } from "@/components/add-transaction-button";
import { SpendingSummaryCards } from "@/components/spending-summary-cards";
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

  if (!profile?.household_id) {
    redirect("/onboarding");
  }

  // Get household details
  const { data: household } = await supabase
    .from("households")
    .select("name, invite_code")
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
    .limit(50);

  // Calculate spending summaries for current month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

  // Get current month's transactions for calculations
  const { data: monthlyTransactions } = await supabase
    .from("transactions")
    .select("amount, user_id, is_joint")
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

  // Get partner info
  const partner = members?.find((m) => m.id !== user.id);
  const partnerCount = (members?.length || 1) - 1;
  const hasLinkedAccounts = linkedAccounts && linkedAccounts.length > 0;

  return (
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
            <a
              href="/dashboard"
              className="text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-1"
            >
              Dashboard
            </a>
            <span className="text-sm text-slate-400 cursor-not-allowed">
              Transactions
            </span>
            <span className="text-sm text-slate-400 cursor-not-allowed">
              Goals
            </span>
            <span className="text-sm text-slate-400 cursor-not-allowed">
              Settings
            </span>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Spending Summary Cards */}
        <SpendingSummaryCards
          mySpending={mySpending}
          partnerSpending={partnerSpending}
          jointSpending={jointSpending}
          partnerName={partner?.full_name || null}
          hasPartner={partnerCount > 0}
        />

        {/* Invite Partner Card - Only show if no partner yet */}
        {partnerCount === 0 && (
          <Card className="border-blue-200 bg-blue-50">
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
                <LinkedAccountsList accounts={linkedAccounts} />
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
                      <span className="text-xs text-slate-500 ml-2">(You)</span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500">{member.email}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Transactions Section */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              {transactions && transactions.length > 0
                ? `Showing ${transactions.length} recent transactions`
                : "Your spending will appear here"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TransactionsList transactions={transactions || []} />
          </CardContent>
        </Card>
      </main>

      {/* Floating Action Button for Adding Transactions */}
      <AddTransactionButton />
    </div>
  );
}
