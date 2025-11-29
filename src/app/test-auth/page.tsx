import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "./logout-button";

export default async function TestAuthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile from our users table
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-green-600 mb-4">
          ✅ Logged In!
        </h1>

        <div className="space-y-2 text-sm text-slate-600 mb-6">
          <p>
            <strong>Auth Email:</strong> {user.email}
          </p>
          <p>
            <strong>Auth ID:</strong> {user.id}
          </p>
          <p>
            <strong>Profile Name:</strong> {profile?.full_name || "Not set"}
          </p>
          <p>
            <strong>Household ID:</strong>{" "}
            {profile?.household_id || "None (needs onboarding)"}
          </p>
        </div>

        <LogoutButton />
      </div>
    </div>
  );
}
