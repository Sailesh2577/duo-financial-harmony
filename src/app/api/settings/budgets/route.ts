import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch all budgets for the household
export async function GET() {
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

    // Get all budgets for the household
    const { data: budgets, error: budgetsError } = await supabase
      .from("budgets")
      .select(
        `
        *,
        categories (
          id,
          name,
          icon,
          color
        )
      `
      )
      .eq("household_id", userProfile.household_id)
      .order("created_at", { ascending: true });

    if (budgetsError) {
      console.error("Error fetching budgets:", budgetsError);
      return NextResponse.json(
        { error: "Failed to fetch budgets" },
        { status: 500 }
      );
    }

    return NextResponse.json({ budgets: budgets || [] });
  } catch (error) {
    console.error("GET /api/settings/budgets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create or update a budget
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
    const { category_id, monthly_limit, alert_threshold } = body;

    // Validate required fields
    if (monthly_limit === undefined || monthly_limit === null) {
      return NextResponse.json(
        { error: "monthly_limit is required" },
        { status: 400 }
      );
    }

    if (monthly_limit < 0) {
      return NextResponse.json(
        { error: "monthly_limit must be positive" },
        { status: 400 }
      );
    }

    // Upsert (insert or update) the budget
    const { data: budget, error: upsertError } = await supabase
      .from("budgets")
      .upsert(
        {
          household_id: userProfile.household_id,
          category_id: category_id || null, // null = total household budget
          monthly_limit: parseFloat(monthly_limit),
          alert_threshold: alert_threshold ?? 80,
        },
        {
          onConflict: "household_id,category_id",
        }
      )
      .select(
        `
        *,
        categories (
          id,
          name,
          icon,
          color
        )
      `
      )
      .single();

    if (upsertError) {
      console.error("Error upserting budget:", upsertError);
      return NextResponse.json(
        { error: "Failed to save budget" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, budget });
  } catch (error) {
    console.error("POST /api/settings/budgets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a budget
export async function DELETE(request: NextRequest) {
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
    const { budget_id } = body;

    if (!budget_id) {
      return NextResponse.json(
        { error: "budget_id is required" },
        { status: 400 }
      );
    }

    // Delete the budget (RLS ensures household ownership)
    const { error: deleteError } = await supabase
      .from("budgets")
      .delete()
      .eq("id", budget_id)
      .eq("household_id", userProfile.household_id);

    if (deleteError) {
      console.error("Error deleting budget:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete budget" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/settings/budgets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
