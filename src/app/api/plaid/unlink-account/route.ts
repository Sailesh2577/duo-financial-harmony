import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { plaidClient } from "@/lib/plaid";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
    }

    // Get the linked account
    const { data: account, error: fetchError } = await supabase
      .from("linked_accounts")
      .select("*")
      .eq("id", accountId)
      .eq("user_id", user.id) // Ensure user owns this account
      .single();

    if (fetchError || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Remove from Plaid (optional but good practice)
    try {
      await plaidClient.itemRemove({
        access_token: account.plaid_access_token,
      });
    } catch (plaidError) {
      console.error("Plaid item remove error:", plaidError);
      // Continue anyway - we still want to delete from our DB
    }

    // Delete from our database
    const { error: deleteError } = await supabase
      .from("linked_accounts")
      .delete()
      .eq("id", accountId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to unlink account" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unlinking account:", error);
    return NextResponse.json(
      { error: "Failed to unlink account" },
      { status: 500 }
    );
  }
}
