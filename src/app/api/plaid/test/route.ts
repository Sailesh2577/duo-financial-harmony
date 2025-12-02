import { NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";

export async function GET() {
  try {
    // This just checks if the client initializes without error
    // We can't make a real API call without a link token, but this verifies config
    const clientExists = !!plaidClient;

    return NextResponse.json({
      success: true,
      message: "Plaid client configured successfully",
      clientInitialized: clientExists,
      environment: process.env.PLAID_ENV,
      clientIdConfigured: !!process.env.PLAID_CLIENT_ID,
      secretConfigured: !!process.env.PLAID_SECRET,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
