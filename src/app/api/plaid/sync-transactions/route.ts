import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { plaidClient } from "@/lib/plaid";
import { categorizeTransactionsBatch } from "@/lib/gemini";
import { notifyPartnerNewTransaction } from "@/lib/web-push";
import { checkAndNotifyBudgetAlerts } from "@/lib/budget-alerts";

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

    // 2. Get user's household_id and name
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("household_id, full_name")
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
    const newTransactionIds: string[] = []; // Track new transaction IDs for categorization

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

          // Insert new transaction (without category - will be categorized by AI)
          const { data: insertedTxn, error: insertError } = await supabase
            .from("transactions")
            .insert({
              household_id: userProfile.household_id,
              user_id: account.user_id,
              plaid_transaction_id: txn.transaction_id,
              plaid_account_id: txn.account_id,
              amount: Math.abs(txn.amount), // Plaid uses negative for debits
              date: txn.date,
              description: txn.name,
              merchant_name: txn.merchant_name || txn.name, // Will be cleaned by AI
              is_joint: false, // Default to personal
              is_hidden: false,
              source: "plaid",
              // category_id is intentionally left null - AI will set it
            })
            .select("id, description, amount")
            .single();

          if (!insertError && insertedTxn) {
            newTransactions++;
            newTransactionIds.push(insertedTxn.id);
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

    // 8. Auto-categorize new transactions with AI
    let categorizedCount = 0;
    if (newTransactionIds.length > 0) {
      try {
        // Fetch the new transactions for AI processing
        const { data: newTxns } = await supabase
          .from("transactions")
          .select("id, description, amount")
          .in("id", newTransactionIds);

        if (newTxns && newTxns.length > 0) {
          // Get categories for mapping
          const { data: categories } = await supabase
            .from("categories")
            .select("id, name")
            .eq("is_default", true);

          if (categories) {
            const categoryMap = new Map<string, string>();
            categories.forEach((cat) => {
              categoryMap.set(cat.name.toLowerCase(), cat.id);
            });

            // Process in batches of 20 to avoid overwhelming the AI
            const batchSize = 20;
            for (let i = 0; i < newTxns.length; i += batchSize) {
              const batch = newTxns.slice(i, i + batchSize);
              const transactionsForAI = batch.map((t) => ({
                id: t.id,
                description: t.description,
                amount: Number(t.amount),
              }));

              const aiResults = await categorizeTransactionsBatch(
                transactionsForAI
              );

              // Update each transaction with AI results
              for (const result of aiResults) {
                const categoryId =
                  categoryMap.get(result.category.toLowerCase()) ||
                  categoryMap.get("other");

                const { error: updateError } = await supabase
                  .from("transactions")
                  .update({
                    merchant_name: result.merchantName,
                    category_id: categoryId,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", result.id);

                if (!updateError) {
                  categorizedCount++;
                }
              }
            }
          }
        }
      } catch (aiError) {
        console.error("AI categorization error:", aiError);
        // Don't fail the whole sync if AI fails - transactions are still imported
      }
    }

    // 9. Send push notification to partner if new transactions were synced
    if (newTransactions > 0) {
      // Get the most recent transaction for the notification
      const { data: latestTxn } = await supabase
        .from("transactions")
        .select("amount, merchant_name, description")
        .eq("household_id", userProfile.household_id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestTxn) {
        const actorName = userProfile.full_name || "Your partner";
        notifyPartnerNewTransaction(
          user.id,
          actorName,
          userProfile.household_id,
          Number(latestTxn.amount),
          latestTxn.merchant_name || latestTxn.description
        ).catch(console.error);
      }

      // Check budget alerts (fire and forget)
      checkAndNotifyBudgetAlerts(userProfile.household_id).catch(console.error);
    }

    // 10. Return success with counts
    return NextResponse.json({
      success: true,
      total_fetched: totalTransactions,
      new_transactions: newTransactions,
      categorized: categorizedCount,
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
