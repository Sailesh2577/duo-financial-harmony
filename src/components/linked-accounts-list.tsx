"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LinkedAccount } from "@/types";

interface LinkedAccountsListProps {
  accounts: LinkedAccount[];
  currentUserId: string;
  householdMembers: { id: string; full_name: string | null }[];
}

export function LinkedAccountsList({
  accounts,
  currentUserId,
  householdMembers,
}: LinkedAccountsListProps) {
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const router = useRouter();

  if (accounts.length === 0) {
    return null;
  }

  const getOwnerName = (userId: string) => {
    if (userId === currentUserId) return "You";
    const member = householdMembers.find((m) => m.id === userId);
    return member?.full_name || "Partner";
  };

  const isOwnAccount = (userId: string) => userId === currentUserId;

  const handleUnlink = async (accountId: string, accountName: string) => {
    if (
      !confirm(
        `Are you sure you want to unlink ${accountName}? This will not delete your transaction history.`
      )
    ) {
      return;
    }

    setUnlinkingId(accountId);

    try {
      const response = await fetch("/api/plaid/unlink-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to unlink");
      }

      router.refresh();
    } catch (error) {
      console.error("Unlink error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to unlink account. Please try again."
      );
    } finally {
      setUnlinkingId(null);
    }
  };

  const formatSyncTime = (timestamp: string | null) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-700">Connected Accounts</p>
      {accounts.map((account) => (
        <div
          key={account.id}
          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-lg">🏦</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-900">
                  {account.institution_name}
                </p>
                {/* Ownership badge */}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    isOwnAccount(account.user_id)
                      ? "bg-blue-100 text-blue-700"
                      : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {getOwnerName(account.user_id)}
                </span>
              </div>
              <p className="text-sm text-slate-500">
                {account.account_name || account.account_type || "Account"}
                {account.account_mask && ` ••••${account.account_mask}`}
              </p>
            </div>
          </div>
          <div className="text-right flex items-center gap-3">
            <div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  account.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {account.status === "active"
                  ? "✓ Connected"
                  : "⚠ Needs Attention"}
              </span>
              {account.last_synced_at && (
                <p className="text-xs text-slate-400 mt-1">
                  Synced: {formatSyncTime(account.last_synced_at)}
                </p>
              )}
            </div>
            {/* Only show unlink button for own accounts */}
            {isOwnAccount(account.user_id) ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleUnlink(
                    account.id,
                    account.institution_name || "this account"
                  )
                }
                disabled={unlinkingId === account.id}
                className="text-slate-400 hover:text-red-500 text-xs"
              >
                {unlinkingId === account.id ? "..." : "✕"}
              </Button>
            ) : (
              // Empty space to maintain alignment, or show a tooltip
              <div className="w-8" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
