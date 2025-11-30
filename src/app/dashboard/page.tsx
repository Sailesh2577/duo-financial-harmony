import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-3xl font-bold text-center">Dashboard</h1>

        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Welcome back,
            </p>
            <p className="font-medium text-lg">
              {profile?.full_name || user.email}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Household ID:
            </p>
            <p className="font-mono text-sm">{profile?.household_id}</p>
          </div>
        </div>

        <p className="text-center text-green-600 dark:text-green-400">
          ✅ Middleware is working! Protected route accessible.
        </p>

        <p className="text-center text-gray-500 text-sm">
          (Issue #10 will build the real dashboard UI)
        </p>
      </div>
    </div>
  );
}
