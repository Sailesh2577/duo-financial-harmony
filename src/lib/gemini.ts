import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini client
// Note: Ensure process.env.GOOGLE_GEMINI_API_KEY is defined in your .env.local file
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

// Get the Gemini 2.0 Flash model (fast and free tier eligible)
export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

// Helper function to clean and categorize a transaction
export async function categorizeTransaction(
  description: string,
  amount: number
): Promise<{
  merchantName: string;
  category: string;
  confidence: "high" | "medium" | "low";
}> {
  const prompt = `You are a financial transaction categorizer. Given a raw bank transaction description, extract the merchant name and assign a category.

Raw transaction: "${description}"
Amount: $${amount}

Categories to choose from (pick the most appropriate one):
- Groceries
- Dining Out
- Transportation
- Shopping
- Bills & Utilities
- Entertainment
- Healthcare
- Travel
- Personal Care
- Other

Respond in JSON format only, no markdown:
{
  "merchantName": "Clean merchant name (e.g., 'Amazon' not 'AMZN MKTP US*2H8K')",
  "category": "One of the categories above",
  "confidence": "high, medium, or low based on how certain you are"
}`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    // Remove any markdown code blocks if present
    const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleanedText);

    return {
      merchantName: parsed.merchantName || description,
      category: parsed.category || "Other",
      confidence: parsed.confidence || "low",
    };
  } catch (error) {
    console.error("Gemini categorization error:", error);
    // Return defaults if AI fails
    return {
      merchantName: description,
      category: "Other",
      confidence: "low",
    };
  }
}

// Helper function to categorize multiple transactions in batch
export async function categorizeTransactionsBatch(
  transactions: Array<{ description: string; amount: number; id: string }>
): Promise<
  Array<{
    id: string;
    merchantName: string;
    category: string;
    confidence: "high" | "medium" | "low";
  }>
> {
  const prompt = `You are a financial transaction categorizer. Given a list of raw bank transaction descriptions, extract merchant names and assign categories for each.

Transactions:
${transactions
  .map((t, i) => `${i + 1}. "${t.description}" - $${t.amount}`)
  .join("\n")}

Categories to choose from:
- Groceries
- Dining Out
- Transportation
- Shopping
- Bills & Utilities
- Entertainment
- Healthcare
- Travel
- Personal Care
- Other

Respond in JSON format only, no markdown. Return an array with one object per transaction in the same order:
[
  {
    "index": 1,
    "merchantName": "Clean merchant name",
    "category": "Category name",
    "confidence": "high/medium/low"
  }
]`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleanedText);

    // Map results back to transaction IDs
    return transactions.map((t, index) => {
      // Find the result by index (handling potential 1-based indexing from AI)
      const result =
        parsed[index] ||
        parsed.find((p: { index: number }) => p.index === index + 1);
      return {
        id: t.id,
        merchantName: result?.merchantName || t.description,
        category: result?.category || "Other",
        confidence: result?.confidence || "low",
      };
    });
  } catch (error) {
    console.error("Gemini batch categorization error:", error);
    // Return defaults if AI fails
    return transactions.map((t) => ({
      id: t.id,
      merchantName: t.description,
      category: "Other",
      confidence: "low",
    }));
  }
}
