"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Generate a random invite code like "JOIN-5X9K2A"
function generateInviteCode(): string {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars (0, O, 1, I)
  let code = "JOIN-";
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

export async function createHousehold(formData: FormData) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in to create a household" };
  }

  // Check if user already has a household
  const { data: existingUser } = await supabase
    .from("users")
    .select("household_id")
    .eq("id", user.id)
    .single();

  if (existingUser?.household_id) {
    return { error: "You are already a member of a household" };
  }

  // Get form data
  const name = formData.get("name") as string;

  if (!name || name.trim().length < 2) {
    return { error: "Household name must be at least 2 characters" };
  }

  // Generate unique invite code (retry if collision)
  let inviteCode = generateInviteCode();
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const { data: existing } = await supabase
      .from("households")
      .select("id")
      .eq("invite_code", inviteCode)
      .single();

    if (!existing) break; // Code is unique

    inviteCode = generateInviteCode();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    return { error: "Failed to generate invite code. Please try again." };
  }

  // Create household
  const { data: household, error: householdError } = await supabase
    .from("households")
    .insert({
      name: name.trim(),
      invite_code: inviteCode,
      created_by: user.id,
    })
    .select()
    .single();

  if (householdError) {
    console.error("Household creation error:", householdError);
    return { error: "Failed to create household. Please try again." };
  }

  // Link user to household
  const { error: updateError } = await supabase
    .from("users")
    .update({ household_id: household.id })
    .eq("id", user.id);

  if (updateError) {
    console.error("User update error:", updateError);
    // Rollback: delete the household we just created
    await supabase.from("households").delete().eq("id", household.id);
    return { error: "Failed to join household. Please try again." };
  }

  // Success - redirect to dashboard
  redirect("/dashboard");
}
