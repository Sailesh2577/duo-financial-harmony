"use client";

import { useState, useCallback, Suspense } from "react";
import { Transaction, Category } from "@/types";
import { TransactionFilters } from "./transaction-filters";
import { TransactionRow } from "./transaction-row";

interface HouseholdMember {
  id: string;
  full_name: string | null;
  email: string;
}

interface FilteredTransactionsListProps {
  transactions: Transaction[];
  categories: Category[];
  currentUserId: string;
  householdMembers: HouseholdMember[];
}

export function FilteredTransactionsList({
  transactions,
  categories,
  currentUserId,
  householdMembers,
}: FilteredTransactionsListProps) {
  const [filteredTransactions, setFilteredTransactions] =
    useState<Transaction[]>(transactions);

  // Memoize the callback to avoid unnecessary re-renders
  const handleFilteredTransactionsChange = useCallback(
    (filtered: Transaction[]) => {
      setFilteredTransactions(filtered);
    },
    []
  );

  // Create lookup maps
  const categoryMap = new Map<string, Category>();
  categories.forEach((cat) => {
    categoryMap.set(cat.id, cat);
  });

  const memberMap = new Map<string, HouseholdMember>();
  householdMembers.forEach((member) => {
    memberMap.set(member.id, member);
  });

  // Helper to get owner display name
  const getOwnerName = (userId: string): string => {
    if (userId === currentUserId) {
      return "You";
    }
    const member = memberMap.get(userId);
    if (member?.full_name) {
      return member.full_name.split(" ")[0];
    }
    return member?.email?.split("@")[0] || "Unknown";
  };

  // Group transactions by date
  const groupedByDate = filteredTransactions.reduce((groups, txn) => {
    const date = txn.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(txn);
    return groups;
  }, {} as Record<string, Transaction[]>);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateString === today.toISOString().split("T")[0]) {
      return "Today";
    } else if (dateString === yesterday.toISOString().split("T")[0]) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <Suspense fallback={<FiltersSkeleton />}>
        <TransactionFilters
          categories={categories}
          transactions={transactions}
          onFilteredTransactionsChange={handleFilteredTransactionsChange}
        />
      </Suspense>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <EmptyState hasFilters={transactions.length > 0} />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, dayTransactions]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-slate-500 mb-2">
                  {formatDate(date)}
                </h3>
                <div className="space-y-2">
                  {dayTransactions.map((txn) => {
                    const category = txn.category_id
                      ? categoryMap.get(txn.category_id)
                      : null;
                    return (
                      <TransactionRow
                        key={`${txn.id}-${txn.updated_at}`}
                        transaction={txn}
                        category={category || null}
                        ownerName={getOwnerName(txn.user_id)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// Loading skeleton for filters
function FiltersSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-10 bg-slate-100 rounded-md" />
      <div className="flex gap-2">
        <div className="h-9 w-32 bg-slate-100 rounded-md" />
        <div className="h-9 w-32 bg-slate-100 rounded-md" />
        <div className="h-9 w-24 bg-slate-100 rounded-md" />
        <div className="h-9 w-28 bg-slate-100 rounded-md" />
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  if (hasFilters) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">🔍</p>
        <h3 className="font-semibold text-slate-900 mb-1">
          No matching transactions
        </h3>
        <p className="text-sm text-slate-500">
          Try adjusting your filters to see more results
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <p className="text-4xl mb-3">💰</p>
      <h3 className="font-semibold text-slate-900 mb-1">No transactions yet</h3>
      <p className="text-sm text-slate-500">
        Click Sync Transactions to import from your bank
      </p>
    </div>
  );
}
