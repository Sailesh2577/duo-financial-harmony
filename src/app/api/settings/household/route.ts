import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// PATCH - Update household settings
export async function PATCH(request: NextRequest) {
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

    // Get user's household_id
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("household_id")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile?.household_id) {
      return NextResponse.json(
        { error: "No household found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { show_settlement } = body;

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (typeof show_settlement === "boolean") {
      updateData.show_settlement = show_settlement;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Update household
    const { error: updateError } = await supabase
      .from("households")
      .update(updateData)
      .eq("id", userProfile.household_id);

    if (updateError) {
      console.error("Error updating household:", updateError);
      return NextResponse.json(
        { error: "Failed to update household settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/settings/household error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
