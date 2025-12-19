import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Export transactions to CSV
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's household_id
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("household_id")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile?.household_id) {
      return NextResponse.json(
        { error: "No household found" },
        { status: 404 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const type = searchParams.get("type") || "all"; // all | joint | personal

    // Validate date params
    if (!start || !end) {
      return NextResponse.json(
        { error: "start and end date params are required" },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from("transactions")
      .select(
        `
        id,
        date,
        merchant_name,
        description,
        amount,
        is_joint,
        user_id,
        category_id,
        categories (
          name
        ),
        users!transactions_user_id_fkey (
          full_name
        )
      `
      )
      .eq("household_id", userProfile.household_id)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false });

    // Apply type filter
    if (type === "joint") {
      query = query.eq("is_joint", true);
    } else if (type === "personal") {
      query = query.eq("is_joint", false);
    }

    const { data: transactions, error: transactionsError } = await query;

    if (transactionsError) {
      console.error("Error fetching transactions:", transactionsError);
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 }
      );
    }

    // Generate CSV
    const csvRows: string[] = [];

    // Header row
    csvRows.push("Date,Merchant,Category,Amount,Type,Added By,Notes");

    // Data rows
    for (const txn of transactions || []) {
      const date = txn.date;
      const merchant = escapeCSV(txn.merchant_name || "");
      const category =
        (txn.categories as { name: string } | null)?.name || "Uncategorized";
      const amount = txn.amount.toFixed(2);
      const txnType = txn.is_joint ? "Joint" : "Personal";
      const addedBy = escapeCSV(
        (txn.users as { full_name: string | null } | null)?.full_name ||
          "Unknown"
      );
      const notes = escapeCSV(txn.description || "");

      csvRows.push(
        `${date},${merchant},${category},${amount},${txnType},${addedBy},${notes}`
      );
    }

    const csvContent = csvRows.join("\n");

    // Build filename
    const typeLabel = type === "all" ? "" : `-${type}`;
    const filename = `duo-transactions${typeLabel}-${start}-to-${end}.csv`;

    // Return CSV response
    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/transactions/export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper to escape CSV fields
function escapeCSV(value: string): string {
  // If the value contains comma, quote, or newline, wrap in quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    // Double any quotes within the value
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  return value;
}
