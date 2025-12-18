import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST - Create a new custom category
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
    const { name, icon, color } = body;

    // Validate name
    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    // Check for duplicate name in this household's custom categories
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("household_id", userProfile.household_id)
      .ilike("name", name.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 }
      );
    }

    // Insert new category
    const { data: category, error: insertError } = await supabase
      .from("categories")
      .insert({
        name: name.trim(),
        icon: icon || null,
        color: color || null,
        is_default: false,
        household_id: userProfile.household_id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating category:", insertError);
      return NextResponse.json(
        { error: "Failed to create category" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error) {
    console.error("POST /api/categories error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
