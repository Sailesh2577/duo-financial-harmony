import { LinkedAccount } from "@/types";

interface LinkedAccountsListProps {
  accounts: LinkedAccount[];
}

export function LinkedAccountsList({ accounts }: LinkedAccountsListProps) {
  if (accounts.length === 0) {
    return null;
  }

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
              <p className="font-medium text-slate-900">
                {account.institution_name}
              </p>
              <p className="text-sm text-slate-500">
                {account.account_name || account.account_type || "Account"}
                {account.account_mask && ` ••••${account.account_mask}`}
              </p>
            </div>
          </div>
          <div className="text-right">
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
                Synced: {new Date(account.last_synced_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
