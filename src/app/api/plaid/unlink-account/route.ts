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

    // First, check if the account exists in the household
    const { data: account, error: fetchError } = await supabase
      .from("linked_accounts")
      .select("*, users!inner(full_name)")
      .eq("id", accountId)
      .single();

    if (fetchError || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Check if the current user owns this account
    if (account.user_id !== user.id) {
      const ownerName = account.users?.full_name || "your partner";
      return NextResponse.json(
        {
          error: `This account was linked by ${ownerName}. Only they can unlink it.`,
          code: "NOT_OWNER",
        },
        { status: 403 }
      );
    }

    // Remove from Plaid
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
        { error: "Failed to unlink account. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unlinking account:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
