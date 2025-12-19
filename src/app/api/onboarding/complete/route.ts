import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST - Mark onboarding as complete
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

    // Update onboarding_completed_at for current user
    const { error: updateError } = await supabase
      .from("users")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating onboarding status:", updateError);
      return NextResponse.json(
        { error: "Failed to update onboarding status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/onboarding/complete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
