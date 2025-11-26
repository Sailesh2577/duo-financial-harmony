"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TestSupabasePage() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("_test")
          .select("*")
          .limit(1);

        // These errors mean connection works, just table doesn't exist (expected!)
        if (
          error &&
          (error.message.includes('relation "_test" does not exist') ||
            error.message.includes("Could not find the table"))
        ) {
          setConnected(true);
        } else if (error) {
          setError(error.message);
          setConnected(false);
        } else {
          setConnected(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setConnected(false);
      }
    }

    testConnection();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-4">Supabase Connection Test</h1>
        {connected === null && (
          <div className="text-slate-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-2"></div>
            <p>Testing connection...</p>
          </div>
        )}
        {connected === true && (
          <div className="text-green-600">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-2xl font-semibold">Connected to Supabase!</p>
            <p className="text-sm mt-2 text-slate-600">
              Your database is ready to use.
            </p>
          </div>
        )}
        {connected === false && (
          <div className="text-red-600">
            <div className="text-6xl mb-4">❌</div>
            <p className="text-2xl font-semibold">Connection Failed</p>
            <p className="text-sm mt-4 text-slate-600 bg-slate-100 p-4 rounded">
              {error}
            </p>
            <p className="text-xs mt-4 text-slate-500">
              Check your .env.local file and make sure NEXT_PUBLIC_SUPABASE_URL
              and NEXT_PUBLIC_SUPABASE_ANON_KEY are correct.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
