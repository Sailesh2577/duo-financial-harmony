import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      {/* Logout button in top right */}
      <div className="absolute top-4 right-4">
        <LogoutButton />
      </div>

      <div className="w-full max-w-md space-y-6 text-center">
        <div className="text-6xl">👋</div>
        <h1 className="text-3xl font-bold">Welcome to Duo!</h1>

        <p className="text-gray-600 dark:text-gray-400">
          Let&apos;s get you set up. You can either create a new household or
          join an existing one.
        </p>

        <div className="space-y-3 pt-4">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <p className="font-medium">🏠 Create Household</p>
            <p className="text-sm text-gray-500">Coming in Issue #8</p>
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <p className="font-medium">🔗 Join with Invite Code</p>
            <p className="text-sm text-gray-500">Coming in Issue #9</p>
          </div>
        </div>

        <p className="text-center text-green-600 dark:text-green-400 text-sm pt-4">
          ✅ Middleware working! You&apos;re here because you don&apos;t have a
          household yet.
        </p>
      </div>
    </div>
  );
}
