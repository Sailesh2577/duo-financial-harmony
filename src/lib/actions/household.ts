"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Validates an invite code and returns the household if valid
 * Uses admin client to bypass RLS (unauthenticated users can't query households)
 */
export async function validateInviteCode(code: string) {
  try {
    const supabase = createAdminClient();

    const { data: household, error } = await supabase
      .from("households")
      .select("id, name")
      .eq("invite_code", code.toUpperCase())
      .single();

    if (error || !household) {
      return { valid: false, household: null };
    }

    return { valid: true, household };
  } catch {
    return { valid: false, household: null };
  }
}

/**
 * Joins the current user to a household via invite code
 * Returns { success: true } or { error: string }
 */
export async function joinHousehold(code: string) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "You must be logged in to join a household" };
    }

    // Wait for the trigger to create the user profile (handles race condition)
    let existingUser = null;
    let userQueryError = null;
    let attempts = 0;

    while (attempts < 3) {
      const result = await supabase
        .from("users")
        .select("household_id")
        .eq("id", user.id)
        .single();

      existingUser = result.data;
      userQueryError = result.error;

      if (
        existingUser ||
        (userQueryError && userQueryError.code !== "PGRST116")
      ) {
        break;
      }

      // User profile not created yet, wait and retry
      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts++;
    }

    if (userQueryError && userQueryError.code === "PGRST116") {
      return { error: "Account setup incomplete. Please try again." };
    }

    if (existingUser?.household_id) {
      return { error: "You are already a member of a household" };
    }

    // Validate invite code
    const { valid, household } = await validateInviteCode(code);

    if (!valid || !household) {
      return { error: "Invalid or expired invite code" };
    }

    // Check household doesn't already have 2 members (MVP limit)
    const adminSupabase = createAdminClient();

    const { count } = await adminSupabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("household_id", household.id);

    if (count && count >= 2) {
      return { error: "This household already has two members" };
    }

    // Join the household
    const { error: updateError } = await supabase
      .from("users")
      .update({ household_id: household.id })
      .eq("id", user.id);

    if (updateError) {
      return { error: "Failed to join household. Please try again." };
    }

    return { success: true };
  } catch {
    return { error: "Server error occurred. Please try again." };
  }
}
