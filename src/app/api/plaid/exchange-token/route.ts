import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { plaidClient } from "@/lib/plaid";

export async function POST(request: Request) {
  try {
    // 1. Get the authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get user's household_id
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("household_id")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile?.household_id) {
      return NextResponse.json(
        { error: "User not in a household" },
        { status: 400 }
      );
    }

    // 3. Get the public_token from the request body
    const { public_token, metadata } = await request.json();

    if (!public_token) {
      return NextResponse.json(
        { error: "Missing public_token" },
        { status: 400 }
      );
    }

    // 4. Exchange public_token for access_token with Plaid
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // 5. Get institution details (bank name, etc.)
    const institutionName = metadata?.institution?.name || "Unknown Bank";

    // 6. Get account details from metadata
    const account = metadata?.accounts?.[0]; // Get first account for now
    const accountName = account?.name || null;
    const accountMask = account?.mask || null;
    const accountType = account?.subtype || account?.type || null;

    // 7. Save to linked_accounts table
    const { data: linkedAccount, error: insertError } = await supabase
      .from("linked_accounts")
      .insert({
        user_id: user.id,
        household_id: userProfile.household_id,
        plaid_access_token: accessToken,
        plaid_item_id: itemId,
        institution_name: institutionName,
        account_name: accountName,
        account_mask: accountMask,
        account_type: accountType,
        status: "active",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error saving linked account:", insertError);
      return NextResponse.json(
        { error: "Failed to save linked account" },
        { status: 500 }
      );
    }

    // 8. Return success with account info (without sensitive token)
    return NextResponse.json({
      success: true,
      linked_account: {
        id: linkedAccount.id,
        institution_name: linkedAccount.institution_name,
        account_name: linkedAccount.account_name,
        account_mask: linkedAccount.account_mask,
        account_type: linkedAccount.account_type,
      },
    });
  } catch (error) {
    console.error("Error exchanging token:", error);
    return NextResponse.json(
      { error: "Failed to exchange token" },
      { status: 500 }
    );
  }
}
