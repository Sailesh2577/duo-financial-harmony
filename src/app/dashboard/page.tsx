import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";
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

  const partnerCount = (members?.length || 1) - 1;

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
        {/* Welcome Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              Welcome, {profile.full_name || user.email}! 🎉
            </CardTitle>
            <CardDescription>
              Your household is set up and ready to go.
            </CardDescription>
          </CardHeader>
        </Card>

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

        {/* Transactions Empty State */}
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-4xl mb-3">💰</p>
            <h3 className="font-semibold text-slate-900 mb-1">
              No transactions yet
            </h3>
            <p className="text-sm text-slate-500">
              Connect your bank account in Phase 2 to see your spending here.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
