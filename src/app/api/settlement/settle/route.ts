import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST - Mark a month as settled
export async function POST(request: NextRequest) {
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
    const {
      month,
      total_joint,
      user_a_id,
      user_a_paid,
      user_b_id,
      user_b_paid,
    } = body;

    // Validate required fields
    if (!month) {
      return NextResponse.json(
        { error: "month is required" },
        { status: 400 }
      );
    }

    if (total_joint === undefined || total_joint === null) {
      return NextResponse.json(
        { error: "total_joint is required" },
        { status: 400 }
      );
    }

    if (!user_a_id || !user_b_id) {
      return NextResponse.json(
        { error: "Both user IDs are required" },
        { status: 400 }
      );
    }

    // Upsert the settlement record
    const { data: settlement, error: upsertError } = await supabase
      .from("settlements")
      .upsert(
        {
          household_id: userProfile.household_id,
          month: month,
          total_joint: parseFloat(total_joint),
          user_a_id: user_a_id,
          user_a_paid: parseFloat(user_a_paid) || 0,
          user_b_id: user_b_id,
          user_b_paid: parseFloat(user_b_paid) || 0,
          settled_at: new Date().toISOString(),
          settled_by: user.id,
        },
        {
          onConflict: "household_id,month",
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("Error upserting settlement:", upsertError);
      return NextResponse.json(
        { error: "Failed to save settlement" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, settlement });
  } catch (error) {
    console.error("POST /api/settlement/settle error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
