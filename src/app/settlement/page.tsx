import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettlementSummary } from "@/components/settlement-summary";
import { SettlementHistory } from "@/components/settlement-history";

export default async function SettlementPage() {
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

  // Get household members
  const { data: members } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("household_id", userProfile.household_id);

  // Find partner
  const partner = members?.find((m) => m.id !== user.id);
  const hasPartner = !!partner;

  // Get partner's display name
  const partnerName = partner?.full_name
    ? partner.full_name.split(" ")[0] // First name only
    : partner?.email?.split("@")[0] || "Partner";

  // Get current month's date range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

  // Fetch current month's joint transactions
  const { data: jointTransactions } = await supabase
    .from("transactions")
    .select("id, amount, user_id, date, description, merchant_name")
    .eq("household_id", userProfile.household_id)
    .eq("is_joint", true)
    .gte("date", startOfMonthStr)
    .order("date", { ascending: false });

  // Calculate settlement for current month
  const jointTotal = (jointTransactions || []).reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  const myContribution = (jointTransactions || [])
    .filter((t) => t.user_id === user.id)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const partnerContribution = jointTotal - myContribution;

  // Calculate who owes whom
  const fairShare = jointTotal / 2;
  const balance = myContribution - fairShare;
  // balance > 0 = I paid more, partner owes me
  // balance < 0 = I paid less, I owe partner

  // Check if current month is already settled
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const { data: currentSettlement } = await supabase
    .from("settlements")
    .select("*")
    .eq("household_id", userProfile.household_id)
    .eq("month", currentMonthKey)
    .single();

  const isCurrentMonthSettled = !!currentSettlement?.settled_at;

  // Fetch past settlements (excluding current month)
  const { data: pastSettlements } = await supabase
    .from("settlements")
    .select("*")
    .eq("household_id", userProfile.household_id)
    .lt("month", currentMonthKey)
    .order("month", { ascending: false })
    .limit(12);

  // Format month for display
  const currentMonthName = now.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Current Month Settlement */}
      <SettlementSummary
        monthName={currentMonthName}
        monthKey={currentMonthKey}
        jointTotal={jointTotal}
        myContribution={myContribution}
        partnerContribution={partnerContribution}
        balance={balance}
        partnerName={partnerName}
        hasPartner={hasPartner}
        isSettled={isCurrentMonthSettled}
        currentUserId={user.id}
        partnerId={partner?.id || null}
      />

      {/* Past Settlements */}
      <SettlementHistory
        settlements={pastSettlements || []}
        currentUserId={user.id}
        partnerName={partnerName}
      />
    </div>
  );
}
