"use client";

import { useState } from "react";
import { joinHousehold } from "@/lib/actions/household";

interface JoinHouseholdClientProps {
  code: string;
  householdName: string;
}

export default function JoinHouseholdClient({
  code,
  householdName,
}: JoinHouseholdClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setIsLoading(true);
    setError(null);

    const result = await joinHousehold(code);

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    if (result?.success) {
      // Redirect to dashboard on success
      window.location.href = "/dashboard?welcome=joined";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-5xl mb-4">🏠</div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Join Household
        </h1>
        <p className="text-slate-600 mb-6">
          You&apos;ve been invited to join{" "}
          <span className="font-semibold text-slate-900">{householdName}</span>
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={isLoading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {isLoading ? "Joining..." : "Join Household"}
        </button>

        <p className="text-sm text-slate-500 mt-4">
          By joining, you&apos;ll be able to share finances with your partner.
        </p>
      </div>
    </div>
  );
}
