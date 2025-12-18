import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// PUT - Update a custom category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Verify category exists and belongs to this household
    const { data: existingCategory } = await supabase
      .from("categories")
      .select("id, is_default, household_id")
      .eq("id", id)
      .single();

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    if (existingCategory.is_default) {
      return NextResponse.json(
        { error: "Cannot edit system categories" },
        { status: 403 }
      );
    }

    if (existingCategory.household_id !== userProfile.household_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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

    // Check for duplicate name (excluding current category)
    const { data: duplicate } = await supabase
      .from("categories")
      .select("id")
      .eq("household_id", userProfile.household_id)
      .ilike("name", name.trim())
      .neq("id", id)
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 }
      );
    }

    // Update category
    const { data: category, error: updateError } = await supabase
      .from("categories")
      .update({
        name: name.trim(),
        icon: icon || null,
        color: color || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating category:", updateError);
      return NextResponse.json(
        { error: "Failed to update category" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("PUT /api/categories/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a custom category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Verify category exists and belongs to this household
    const { data: existingCategory } = await supabase
      .from("categories")
      .select("id, is_default, household_id")
      .eq("id", id)
      .single();

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    if (existingCategory.is_default) {
      return NextResponse.json(
        { error: "Cannot delete system categories" },
        { status: 403 }
      );
    }

    if (existingCategory.household_id !== userProfile.household_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check for reassign_to in body (optional)
    let reassignTo: string | undefined;
    try {
      const body = await request.json();
      reassignTo = body.reassign_to;
    } catch {
      // No body or invalid JSON - that's fine, we'll just delete without reassigning
    }

    // If reassigning, update all transactions first
    if (reassignTo) {
      const { error: reassignError } = await supabase
        .from("transactions")
        .update({ category_id: reassignTo })
        .eq("category_id", id)
        .eq("household_id", userProfile.household_id);

      if (reassignError) {
        console.error("Error reassigning transactions:", reassignError);
        return NextResponse.json(
          { error: "Failed to reassign transactions" },
          { status: 500 }
        );
      }
    } else {
      // Set transactions to uncategorized (null)
      const { error: uncategorizeError } = await supabase
        .from("transactions")
        .update({ category_id: null })
        .eq("category_id", id)
        .eq("household_id", userProfile.household_id);

      if (uncategorizeError) {
        console.error("Error uncategorizing transactions:", uncategorizeError);
        return NextResponse.json(
          { error: "Failed to update transactions" },
          { status: 500 }
        );
      }
    }

    // Delete the category
    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting category:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete category" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/categories/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
