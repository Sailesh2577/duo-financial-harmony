/**
 * @deprecated Consider using FilteredTransactionsList instead.
 * This component is kept for potential use in simpler contexts
 * where filtering is not needed (modals, export previews, etc.)
 *
 * If unused after Phase 4, safe to delete.
 */

import { Transaction, Category } from "@/types";
import { TransactionRow } from "./transaction-row";

interface HouseholdMember {
  id: string;
  full_name: string | null;
  email: string;
}

interface TransactionsListProps {
  transactions: Transaction[];
  categories: Category[];
  currentUserId: string;
  householdMembers: HouseholdMember[];
}

export function TransactionsList({
  transactions,
  categories,
  currentUserId,
  householdMembers,
}: TransactionsListProps) {
  // Create a lookup map for category IDs -> category objects
  const categoryMap = new Map<string, Category>();
  categories.forEach((cat) => {
    categoryMap.set(cat.id, cat);
  });

  // Create a lookup map for member IDs -> member info
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
      // Return first name only for cleaner display
      return member.full_name.split(" ")[0];
    }
    return member?.email?.split("@")[0] || "Unknown";
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-4xl mb-3">💰</p>

        <h3 className="font-semibold text-slate-900 mb-1">
          No transactions yet
        </h3>

        <p className="text-sm text-slate-500">
          Click Sync Transactions to import from your bank
        </p>
      </div>
    );
  }

  // Group transactions by date

  const groupedByDate = transactions.reduce((groups, txn) => {
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
    <div className="space-y-6">
      {Object.entries(groupedByDate)

        .sort(([a], [b]) => b.localeCompare(a)) // Sort by date descending

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
  );
}
