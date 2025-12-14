import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyPartnerToggleChange } from "@/lib/web-push";
import { checkAndNotifyBudgetAlerts } from "@/lib/budget-alerts";

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

    // 3. Parse request body
    const body = await request.json();
    const { transactionId, isJoint } = body as {
      transactionId: string;
      isJoint: boolean;
    };

    if (!transactionId || typeof isJoint !== "boolean") {
      return NextResponse.json(
        { error: "transactionId and isJoint are required" },
        { status: 400 }
      );
    }

    // 4. Update the transaction (RLS ensures household security)
    const { data: updatedTransaction, error: updateError } = await supabase
      .from("transactions")
      .update({
        is_joint: isJoint,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId)
      .eq("household_id", userProfile.household_id) // Security check
      .select()
      .single();

    if (updateError) {
      console.error("Error updating transaction:", updateError);
      return NextResponse.json(
        { error: "Failed to update transaction" },
        { status: 500 }
      );
    }

    // 5. Send push notification to partner (fire and forget)
    const actorName = userProfile.full_name || "Your partner";
    notifyPartnerToggleChange(
      user.id,
      actorName,
      userProfile.household_id,
      Number(updatedTransaction.amount),
      updatedTransaction.merchant_name || updatedTransaction.description,
      isJoint
    ).catch(console.error);

    // 6. Check budget alerts (fire and forget)
    checkAndNotifyBudgetAlerts(userProfile.household_id).catch(console.error);

    // 7. Return success
    return NextResponse.json({
      success: true,
      transaction: updatedTransaction,
    });
  } catch (error) {
    console.error("Error toggling joint status:", error);
    return NextResponse.json(
      { error: "Failed to toggle joint status" },
      { status: 500 }
    );
  }
}
