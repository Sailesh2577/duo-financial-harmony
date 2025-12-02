"use client";

import { useCallback, useState, useEffect } from "react";
import {
  usePlaidLink,
  PlaidLinkOnSuccessMetadata,
  PlaidLinkError,
} from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface PlaidLinkButtonProps {
  onSuccess?: () => void;
}

export function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchLinkToken = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/plaid/create-link-token", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to create link token");
      const data = await response.json();
      setLinkToken(data.link_token);
    } catch (err) {
      console.error("Error fetching link token:", err);
      setError("Failed to initialize bank connection. Please try again.");
      setIsLoading(false);
    }
  };

  // 2. Fix: Use PlaidLinkOnSuccessMetadata
  const handleOnSuccess = useCallback(
    async (public_token: string, metadata: PlaidLinkOnSuccessMetadata) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token, metadata }),
        });

        if (!response.ok) throw new Error("Failed to link bank account");

        const data = await response.json();
        console.log("Bank linked successfully:", data);

        router.refresh();
        onSuccess?.();
      } catch (err) {
        console.error("Error exchanging token:", err);
        setError("Failed to link bank account. Please try again.");
      } finally {
        setIsLoading(false);
        setLinkToken(null);
      }
    },
    [router, onSuccess]
  );

  // 3. Fix: Use PlaidLinkError | null (It can be null if user manually closes it)
  const handleOnExit = useCallback((err: PlaidLinkError | null) => {
    if (err) {
      console.error("Plaid Link error:", err);
      setError("Bank connection was interrupted. Please try again.");
    }
    // If no error (user just closed the window), stop loading but don't show error
    setIsLoading(false);
    setLinkToken(null);
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleOnSuccess,
    onExit: handleOnExit,
  });

  // 4. Recommendation: Move the auto-open logic into a useEffect
  // Doing this directly in the render body (as you had before) is an anti-pattern
  // and can cause "Too many re-renders" errors.
  useEffect(() => {
    if (linkToken && ready && isLoading) {
      open();
    }
  }, [linkToken, ready, isLoading, open]);

  const handleClick = async () => {
    // Only fetch if we don't have a token yet
    if (!linkToken) {
      await fetchLinkToken();
    }
  };

  return (
    <div>
      <Button onClick={handleClick} disabled={isLoading} className="w-full">
        {isLoading ? "Connecting..." : "🏦 Link Bank Account"}
      </Button>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}
