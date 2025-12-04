import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Users } from "lucide-react";

interface SpendingSummaryCardsProps {
  mySpending: number;
  partnerSpending: number;
  jointSpending: number;
  partnerName: string | null;
  hasPartner: boolean;
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Helper function to get current month name
function getCurrentMonthName(): string {
  return new Date().toLocaleString("en-US", { month: "long" });
}

export function SpendingSummaryCards({
  mySpending,
  partnerSpending,
  jointSpending,
  partnerName,
  hasPartner,
}: SpendingSummaryCardsProps) {
  const currentMonth = getCurrentMonthName();

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* My Spending Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            My Spending
          </CardTitle>
          <User className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(mySpending)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {currentMonth} • Personal expenses
          </p>
        </CardContent>
      </Card>

      {/* Partner Spending Card */}
      <Card className={!hasPartner ? "opacity-50" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {hasPartner
              ? `${partnerName || "Partner"}'s Spending`
              : "Partner Spending"}
          </CardTitle>
          <User className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">
            {hasPartner ? formatCurrency(partnerSpending) : "—"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {hasPartner
              ? `${currentMonth} • Personal expenses`
              : "Waiting for partner to join"}
          </p>
        </CardContent>
      </Card>

      {/* Joint Spending Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Joint Spending
          </CardTitle>
          <Users className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">
            {formatCurrency(jointSpending)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {currentMonth} • Shared expenses
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
