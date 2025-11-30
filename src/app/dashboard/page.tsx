import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">
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
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Welcome Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-2">
            Welcome, {profile.full_name || user.email}! 🎉
          </h2>
          <p className="text-slate-600">
            Your household is set up and ready to go.
          </p>
        </div>

        {/* Invite Partner Card - Only show if no partner yet */}
        {partnerCount === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              📨 Invite Your Partner
            </h3>
            <p className="text-blue-800 text-sm mb-4">
              Share this code with your partner so they can join your household:
            </p>
            <div className="bg-white border border-blue-300 rounded-md p-4 text-center">
              <p className="text-2xl font-mono font-bold tracking-wider text-blue-600">
                {household?.invite_code}
              </p>
            </div>
            <p className="text-xs text-blue-700 mt-3 text-center">
              They can enter this code at signup or on the join page
            </p>
          </div>
        )}

        {/* Household Members */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="font-semibold mb-4">Household Members</h3>
          <div className="space-y-3">
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
                  <p className="font-medium">
                    {member.full_name || "No name set"}
                    {member.id === user.id && (
                      <span className="text-xs text-slate-500 ml-2">(You)</span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500">{member.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Placeholder for future features */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 text-center text-slate-500">
          <p className="text-4xl mb-2">📊</p>
          <p>Transaction feed and spending summaries coming in Phase 3!</p>
        </div>
      </main>
    </div>
  );
}
