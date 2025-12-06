"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

// Singleton channel for broadcasting
let globalChannel: RealtimeChannel | null = null;

export function getRealtimeChannel() {
  return globalChannel;
}

export function broadcastTransactionUpdate(
  type: "INSERT" | "UPDATE" | "DELETE",
  transactionId: string
) {
  if (globalChannel) {
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

  const handleUpdate = useCallback(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!householdId) {
      return;
    }

    const supabase = createClient();
    supabaseRef.current = supabase;

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
          self: false,
        },
      },
    });

    // Listen for broadcast events from other clients
    channel.on("broadcast", { event: "transaction-change" }, () => {
      handleUpdate();
    });

    channel.subscribe((status, err) => {
      if (err) {
        console.error("Realtime subscription error:", err);
      }

      switch (status) {
        case "SUBSCRIBED":
          setStatus("connected");
          break;
        case "CHANNEL_ERROR":
          setStatus("error");
          break;
        case "TIMED_OUT":
          setStatus("disconnected");
          break;
        case "CLOSED":
          setStatus("disconnected");
          break;
      }
    });

    channelRef.current = channel;
    globalChannel = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
        globalChannel = null;
      }
    };
  }, [householdId, handleUpdate]);

  return { status };
}
