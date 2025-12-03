import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { plaidClient } from "@/lib/plaid";

export async function POST() {
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

    // 3. Get all linked accounts for this household
    const { data: linkedAccounts, error: accountsError } = await supabase
      .from("linked_accounts")
      .select("*")
      .eq("household_id", userProfile.household_id)
      .eq("status", "active");

    if (accountsError || !linkedAccounts || linkedAccounts.length === 0) {
      return NextResponse.json(
        { error: "No linked bank accounts found" },
        { status: 400 }
      );
    }

    // 4. Set date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const formatDate = (date: Date) => date.toISOString().split("T")[0];

    let totalTransactions = 0;
    let newTransactions = 0;

    // 5. Fetch transactions for each linked account
    for (const account of linkedAccounts) {
      try {
        // Call Plaid transactions/get
        const response = await plaidClient.transactionsGet({
          access_token: account.plaid_access_token,
          start_date: formatDate(startDate),
          end_date: formatDate(endDate),
        });

        const transactions = response.data.transactions;
        totalTransactions += transactions.length;

        // 6. Process each transaction
        for (const txn of transactions) {
          // Check if transaction already exists (prevent duplicates)
          const { data: existing } = await supabase
            .from("transactions")
            .select("id")
            .eq("plaid_transaction_id", txn.transaction_id)
            .single();

          if (existing) {
            // Skip duplicate
            continue;
          }

          // Insert new transaction
          const { error: insertError } = await supabase
            .from("transactions")
            .insert({
              household_id: userProfile.household_id,
              user_id: account.user_id,
              plaid_transaction_id: txn.transaction_id,
              plaid_account_id: txn.account_id,
              amount: Math.abs(txn.amount), // Plaid uses negative for debits
              date: txn.date,
              description: txn.name,
              merchant_name: txn.merchant_name || txn.name,
              is_joint: false, // Default to personal
              is_hidden: false,
              source: "plaid",
            });

          if (!insertError) {
            newTransactions++;
          }
        }

        // 7. Update last_synced_at for this account
        await supabase
          .from("linked_accounts")
          .update({
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", account.id);
      } catch (plaidError) {
        console.error(
          `Error fetching transactions for account ${account.id}:`,
          plaidError
        );
        // Continue with other accounts even if one fails
      }
    }

    // 8. Return success with counts
    return NextResponse.json({
      success: true,
      total_fetched: totalTransactions,
      new_transactions: newTransactions,
      accounts_synced: linkedAccounts.length,
    });
  } catch (error) {
    console.error("Error syncing transactions:", error);
    return NextResponse.json(
      { error: "Failed to sync transactions" },
      { status: 500 }
    );
  }
}
