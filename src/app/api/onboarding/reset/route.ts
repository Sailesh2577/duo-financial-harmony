import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST - Reset onboarding (set to null to trigger walkthrough again)
export async function POST() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Set onboarding_completed_at to null for current user
    const { error: updateError } = await supabase
      .from("users")
      .update({ onboarding_completed_at: null })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error resetting onboarding status:", updateError);
      return NextResponse.json(
        { error: "Failed to reset onboarding status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/onboarding/reset error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
