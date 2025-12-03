import { Transaction } from "@/types";

interface TransactionsListProps {
  transactions: Transaction[];
}

export function TransactionsList({ transactions }: TransactionsListProps) {
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
              {dayTransactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        txn.is_joint ? "bg-purple-100" : "bg-slate-100"
                      }`}
                    >
                      <span className="text-lg">
                        {txn.is_joint ? "👥" : "👤"}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {txn.merchant_name || txn.description}
                      </p>
                      <p className="text-sm text-slate-500">
                        {txn.is_joint ? "Joint" : "Personal"}
                        {txn.description !== txn.merchant_name && (
                          <span className="text-slate-400 ml-2">
                            • {txn.description.substring(0, 30)}
                            {txn.description.length > 30 ? "..." : ""}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      -{formatAmount(txn.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
