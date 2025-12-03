"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function SyncTransactionsButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const router = useRouter();

  const handleSync = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/plaid/sync-transactions", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync");
      }

      setResult({
        success: true,
        message: `Synced ${data.new_transactions} new transactions`,
      });

      // Refresh the page to show new transactions
      router.refresh();
    } catch (error) {
      console.error("Sync error:", error);
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to sync transactions",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Button
        onClick={handleSync}
        disabled={isLoading}
        variant="outline"
        size="sm"
      >
        {isLoading ? "Syncing..." : "🔄 Sync"}
      </Button>

      {result && (
        <p
          className={`text-xs mt-1 ${
            result.success ? "text-green-600" : "text-red-500"
          }`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
