"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

// Singleton to get the channel for broadcasting
let globalChannel: RealtimeChannel | null = null;
let globalHouseholdId: string | null = null;

export function getRealtimeChannel() {
  return globalChannel;
}

export function broadcastTransactionUpdate(
  type: "INSERT" | "UPDATE" | "DELETE",
  transactionId: string
) {
  if (globalChannel) {
    console.log("📤 Broadcasting transaction update:", type, transactionId);
    globalChannel.send({
      type: "broadcast",
      event: "transaction-change",
      payload: { type, transactionId, timestamp: Date.now() },
    });
  }
}

export function useRealtimeTransactions(householdId: string) {
  const router = useRouter();
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null);

  const handleUpdate = useCallback(
    (payload: unknown) => {
      console.log("🔄 Transaction changed, refreshing dashboard...", payload);
      router.refresh();
    },
    [router]
  );

  useEffect(() => {
    if (!householdId) {
      console.log("⚠️ No householdId provided, skipping realtime subscription");
      return;
    }

    console.log(
      "🔌 Setting up realtime subscription for household:",
      householdId
    );

    const supabase = createClient();
    supabaseRef.current = supabase;

    // Debug: Check auth state
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error("🔐 Auth error:", error);
      } else if (data.user) {
        console.log("🔐 Authenticated as:", data.user.email);
      } else {
        console.warn("🔐 No authenticated user found!");
      }
    });

    // Create a unique channel name for this household
    const channelName = `household-${householdId}`;

    // Remove any existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Use Broadcast channel - more reliable than postgres_changes
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: {
          // Receive our own broadcasts (useful for debugging)
          self: false,
        },
      },
    });

    // Listen for broadcast events from other clients
    channel.on("broadcast", { event: "transaction-change" }, (payload) => {
      console.log("📨 Received broadcast event:", payload);
      handleUpdate(payload);
    });

    channel.subscribe((status, err) => {
      console.log("📡 Subscription status:", status);
      if (err) {
        console.error("📡 Subscription error:", err);
      }

      switch (status) {
        case "SUBSCRIBED":
          console.log("✅ Successfully subscribed to realtime updates!");
          setStatus("connected");
          break;
        case "CHANNEL_ERROR":
          console.error("❌ Channel error occurred");
          setStatus("error");
          break;
        case "TIMED_OUT":
          console.error("⏱️ Subscription timed out");
          setStatus("disconnected");
          break;
        case "CLOSED":
          console.log("🔒 Channel closed");
          setStatus("disconnected");
          break;
        default:
          console.log("📡 Status:", status);
      }
    });

    channelRef.current = channel;
    globalChannel = channel;
    globalHouseholdId = householdId;

    // Cleanup on unmount
    return () => {
      console.log("🧹 Cleaning up realtime subscription");
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
        globalChannel = null;
        globalHouseholdId = null;
      }
    };
  }, [householdId, handleUpdate]);

  return { status };
}
