import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateInviteCode } from "@/lib/actions/household";
import JoinHouseholdClient from "./join-client";

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { code } = await params;
  const supabase = await createClient();

  // Validate the invite code first
  const { valid, household } = await validateInviteCode(code);

  if (!valid || !household) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Invalid Invite Code
          </h1>
          <p className="text-slate-600 mb-6">
            This invite link is invalid or has expired. Please ask your partner
            for a new invite code.
          </p>
          <a
            href="/login"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Not logged in - redirect to signup with invite code in URL
    // The URL parameter is our primary method for persisting the code
    redirect(`/signup?invite=${code.toUpperCase()}`);
  }

  // User is logged in - check if they already have a household
  const { data: profile } = await supabase
    .from("users")
    .select("household_id")
    .eq("id", user.id)
    .single();

  if (profile?.household_id) {
    // Already in a household
    redirect("/dashboard?error=already_in_household");
  }

  // User is logged in and doesn't have a household - show join UI
  return (
    <JoinHouseholdClient
      code={code.toUpperCase()}
      householdName={household.name}
    />
  );
}
