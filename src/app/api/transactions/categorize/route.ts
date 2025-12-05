import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { categorizeTransactionsBatch } from "@/lib/gemini";

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

    // 3. Parse request body
    const body = await request.json();
    const { transactionIds } = body as { transactionIds?: string[] };

    // 4. Fetch transactions to categorize
    let query = supabase
      .from("transactions")
      .select("id, description, amount, category_id")
      .eq("household_id", userProfile.household_id);

    // If specific IDs provided, filter by them
    // Otherwise, get all uncategorized transactions
    if (transactionIds && transactionIds.length > 0) {
      query = query.in("id", transactionIds);
    } else {
      // Get transactions without a category
      query = query.is("category_id", null);
    }

    const { data: transactions, error: txnError } = await query.limit(50); // Limit batch size

    if (txnError) {
      console.error("Error fetching transactions:", txnError);
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 }
      );
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        categorized: 0,
        message: "No transactions to categorize",
      });
    }

    // 5. Get all default categories for mapping
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id, name")
      .eq("is_default", true);

    if (catError || !categories) {
      console.error("Error fetching categories:", catError);
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 }
      );
    }

    // Create a lookup map for category names -> IDs
    const categoryMap = new Map<string, string>();
    categories.forEach((cat) => {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
    });

    // 6. Call Gemini for batch categorization
    const transactionsForAI = transactions.map((t) => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
    }));

    const aiResults = await categorizeTransactionsBatch(transactionsForAI);

    // 7. Update transactions in database
    const results = [];
    let successCount = 0;

    for (const result of aiResults) {
      // Find the category ID from the AI's category name
      const categoryId =
        categoryMap.get(result.category.toLowerCase()) ||
        categoryMap.get("other"); // Fallback to "Other"

      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          merchant_name: result.merchantName,
          category_id: categoryId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", result.id)
        .eq("household_id", userProfile.household_id); // Security check

      if (!updateError) {
        successCount++;
        results.push({
          id: result.id,
          merchant_name: result.merchantName,
          category: result.category,
          confidence: result.confidence,
        });
      } else {
        console.error(
          `Failed to update transaction ${result.id}:`,
          updateError
        );
      }
    }

    // 8. Return success response
    return NextResponse.json({
      success: true,
      categorized: successCount,
      total: transactions.length,
      results,
    });
  } catch (error) {
    console.error("Error categorizing transactions:", error);
    return NextResponse.json(
      { error: "Failed to categorize transactions" },
      { status: 500 }
    );
  }
}
