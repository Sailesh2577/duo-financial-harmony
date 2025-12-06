"use client";

import { useRealtimeTransactions } from "@/hooks/use-realtime-transactions";
import { WifiOff, Loader2 } from "lucide-react";

interface RealtimeProviderProps {
  householdId: string;
  children: React.ReactNode;
  showIndicator?: boolean;
}

export function RealtimeProvider({
  householdId,
  children,
  showIndicator = true,
}: RealtimeProviderProps) {
  const { status } = useRealtimeTransactions(householdId);

  return (
    <>
      {children}

      {/* Connection Status Indicator - Positioned top-right to avoid Next.js dev indicator */}
      {showIndicator && (
        <div className="fixed top-4 right-4 z-50">
          {status === "connected" && (
            <div className="flex items-center gap-1.5 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm border border-green-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span>Live</span>
            </div>
          )}
          {status === "connecting" && (
            <div className="flex items-center gap-1.5 bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm border border-yellow-200">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Connecting...</span>
            </div>
          )}
          {(status === "disconnected" || status === "error") && (
            <div className="flex items-center gap-1.5 bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm border border-red-200">
              <WifiOff className="h-3 w-3" />
              <span>Offline</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
