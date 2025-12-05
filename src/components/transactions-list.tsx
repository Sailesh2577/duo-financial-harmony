import { Transaction, Category } from "@/types";
import { TransactionRow } from "./transaction-row";

interface TransactionsListProps {
  transactions: Transaction[];

  categories: Category[];
}

export function TransactionsList({
  transactions,

  categories,
}: TransactionsListProps) {
  // Create a lookup map for category IDs -> category objects

  const categoryMap = new Map<string, Category>();

  categories.forEach((cat) => {
    categoryMap.set(cat.id, cat);
  });

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
                    key={txn.id}
                    transaction={txn}
                    category={category || null}
                  />
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}
