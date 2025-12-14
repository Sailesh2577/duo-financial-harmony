import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyPartnerNewTransaction } from "@/lib/web-push";
import { checkAndNotifyBudgetAlerts } from "@/lib/budget-alerts";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's profile to get household_id and name
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("household_id, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.household_id) {
      return NextResponse.json(
        { error: "User not in a household" },
        { status: 400 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { amount, merchantName, categoryId, date, description, isJoint } =
      body as {
        amount: number;
        merchantName: string;
        categoryId?: string;
        date: string;
        description?: string;
        isJoint?: boolean;
      };

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    if (!merchantName || merchantName.trim() === "") {
      return NextResponse.json(
        { error: "Merchant name is required" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    // Insert the transaction
    const { data: transaction, error: insertError } = await supabase
      .from("transactions")
      .insert({
        household_id: profile.household_id,
        user_id: user.id,
        amount: typeof amount === "string" ? parseFloat(amount) : amount,
        date: date,
        description: description || merchantName,
        merchant_name: merchantName.trim(),
        category_id: categoryId || null,
        is_joint: isJoint || false, // Use the passed value, default to false
        is_hidden: false,
        source: "manual",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting transaction:", insertError);
      return NextResponse.json(
        { error: "Failed to create transaction" },
        { status: 500 }
      );
    }

    // Send push notification to partner (fire and forget)
    const actorName = profile.full_name || "Your partner";
    notifyPartnerNewTransaction(
      user.id,
      actorName,
      profile.household_id,
      transaction.amount,
      transaction.merchant_name || transaction.description
    ).catch(console.error);

    // Check budget alerts (fire and forget)
    checkAndNotifyBudgetAlerts(profile.household_id).catch(console.error);

    return NextResponse.json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error("Transaction creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
