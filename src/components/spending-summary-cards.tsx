import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Users, Scale, ArrowRight } from "lucide-react";
import { BudgetProgress } from "@/components/budget-progress";

interface SpendingSummaryCardsProps {
  mySpending: number;
  partnerSpending: number;
  jointSpending: number;
  partnerName: string | null;
  hasPartner: boolean;
  // Budget data (optional)
  totalBudget?: { limit: number; threshold: number } | null;
  jointBudget?: { limit: number; threshold: number } | null;
  // Settlement preview (optional)
  settlementPreview?: { balance: number; partnerName: string } | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getCurrentMonthName(): string {
  return new Date().toLocaleString("default", { month: "long" });
}

export function SpendingSummaryCards({
  mySpending,
  partnerSpending,
  jointSpending,
  partnerName,
  hasPartner,
  totalBudget,
  jointBudget,
  settlementPreview,
}: SpendingSummaryCardsProps) {
  const monthName = getCurrentMonthName();
  const totalSpending = mySpending + partnerSpending + jointSpending;

  return (
    <div className="space-y-4">
      {/* Month indicator */}
      <p className="text-sm text-gray-500">{monthName} spending</p>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* My Spending */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              My Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(mySpending)}
            </p>
          </CardContent>
        </Card>

        {/* Partner's Spending */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-600" />
              {hasPartner && partnerName
                ? `${partnerName}'s Spending`
                : "Partner's Spending"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(partnerSpending)}
            </p>
            {!hasPartner && (
              <p className="text-xs text-gray-400 mt-1">
                Invite your partner to see their spending
              </p>
            )}
          </CardContent>
        </Card>

        {/* Joint Spending */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              Joint Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(jointSpending)}
            </p>
            {/* Joint Budget Progress */}
            {jointBudget && (
              <div className="mt-3">
                <BudgetProgress
                  spent={jointSpending}
                  limit={jointBudget.limit}
                  alertThreshold={jointBudget.threshold}
                  size="sm"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Total Budget Progress (if set) */}
      {totalBudget && (
        <Card className="bg-linear-to-r from-purple-50 to-blue-50">
          <CardContent className="pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Total Household Budget
              </span>
              <span className="text-sm text-gray-500">
                {formatCurrency(totalSpending)} of{" "}
                {formatCurrency(totalBudget.limit)}
              </span>
            </div>
            <BudgetProgress
              spent={totalSpending}
              limit={totalBudget.limit}
              alertThreshold={totalBudget.threshold}
              showAmount={false}
              size="lg"
            />
          </CardContent>
        </Card>
      )}

      {/* Settlement Preview Widget */}
      {settlementPreview && Math.abs(settlementPreview.balance) >= 0.01 && (
        <Link href="/settlement">
          <Card className="bg-linear-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-colors cursor-pointer">
            <CardContent className="pt-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-indigo-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {getCurrentMonthName()} Settlement
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {settlementPreview.balance > 0 ? (
                    <span className="text-sm font-medium text-purple-600">
                      {settlementPreview.partnerName} owes you{" "}
                      {formatCurrency(settlementPreview.balance)}
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-orange-600">
                      You owe {settlementPreview.partnerName}{" "}
                      {formatCurrency(Math.abs(settlementPreview.balance))}
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}
    </div>
  );
}
