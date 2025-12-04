import { NextResponse } from "next/server";
import { categorizeTransaction } from "@/lib/gemini";

export async function GET() {
  try {
    // Test with a sample transaction
    const testTransaction = {
      description: "AMZN MKTP US*2H8KL9M",
      amount: 45.67,
    };

    console.log("Testing Gemini with:", testTransaction);

    const result = await categorizeTransaction(
      testTransaction.description,
      testTransaction.amount
    );

    console.log("Gemini result:", result);

    return NextResponse.json({
      success: true,
      input: testTransaction,
      output: result,
      message: "Gemini API is working correctly!",
    });
  } catch (error) {
    console.error("Gemini test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
