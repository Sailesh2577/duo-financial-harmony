import { Transaction, Category } from "@/types";

interface TransactionsListProps {
  transactions: Transaction[];
  categories: Category[]; // Add categories prop
}

// Category color mapping based on your seeded data
const getCategoryStyle = (categoryName: string) => {
  const styles: Record<string, { bg: string; text: string; emoji: string }> = {
    groceries: { bg: "bg-green-100", text: "text-green-700", emoji: "🛒" },
    "dining out": { bg: "bg-orange-100", text: "text-orange-700", emoji: "🍽️" },
    transportation: { bg: "bg-blue-100", text: "text-blue-700", emoji: "🚗" },
    shopping: { bg: "bg-purple-100", text: "text-purple-700", emoji: "🛍️" },
    "bills & utilities": {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      emoji: "💡",
    },
    entertainment: { bg: "bg-pink-100", text: "text-pink-700", emoji: "🎬" },
    healthcare: { bg: "bg-cyan-100", text: "text-cyan-700", emoji: "⚕️" },
    travel: { bg: "bg-amber-100", text: "text-amber-700", emoji: "✈️" },
    "personal care": { bg: "bg-lime-100", text: "text-lime-700", emoji: "💇" },
    other: { bg: "bg-slate-100", text: "text-slate-700", emoji: "📦" },
  };

  return styles[categoryName.toLowerCase()] || styles.other;
};

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

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
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
                // Get category info
                const category = txn.category_id
                  ? categoryMap.get(txn.category_id)
                  : null;
                const categoryName = category?.name || "Other";
                const categoryStyle = getCategoryStyle(categoryName);

                return (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Category Emoji Icon */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${categoryStyle.bg}`}
                      >
                        <span className="text-lg">{categoryStyle.emoji}</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {txn.merchant_name || txn.description}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {/* Category Badge */}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${categoryStyle.bg} ${categoryStyle.text}`}
                          >
                            {categoryName}
                          </span>
                          {/* Personal/Joint Badge */}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              txn.is_joint
                                ? "bg-purple-100 text-purple-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {txn.is_joint ? "👥 Joint" : "👤 Personal"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        -{formatAmount(txn.amount)}
                      </p>
                      {/* Show raw description if different from merchant name */}
                      {txn.description !== txn.merchant_name && (
                        <p className="text-xs text-slate-400 max-w-[150px] truncate">
                          {txn.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}
