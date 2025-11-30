import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import CreateHouseholdForm from "./create-household-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's name for personalized greeting
  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.full_name || user.email?.split("@")[0] || "there";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      {/* Logout button in top right */}
      <div className="absolute top-4 right-4">
        <LogoutButton />
      </div>

      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="text-6xl mb-4">👋</div>
          <h1 className="text-3xl font-bold">Welcome, {displayName}!</h1>
          <p className="text-gray-600 mt-2">
            Let&apos;s set up your household to start tracking finances
            together.
          </p>
        </div>

        {/* Create Household Section */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🏠</span>
            <h2 className="text-xl font-semibold">Create a Household</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Start fresh and invite your partner to join.
          </p>
          <CreateHouseholdForm />
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 text-slate-500">or</span>
          </div>
        </div>

        {/* Join Household Section */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm opacity-60">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🔗</span>
            <h2 className="text-xl font-semibold">Join with Invite Code</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Have an invite code from your partner? Enter it here.
          </p>
          <div className="text-center py-4 text-slate-500 text-sm">
            Coming in Issue #9
          </div>
        </div>
      </div>
    </div>
  );
}
