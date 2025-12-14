"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { History, Check } from "lucide-react";

interface Settlement {
  id: string;
  month: string;
  total_joint: number;
  user_a_id: string;
  user_a_paid: number;
  user_b_id: string;
  user_b_paid: number;
  settled_at: string | null;
  settled_by: string | null;
  created_at: string;
}

interface SettlementHistoryProps {
  settlements: Settlement[];
  currentUserId: string;
  partnerName: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatMonthName(monthStr: string): string {
  const date = new Date(monthStr + "T00:00:00");
  return date.toLocaleString("default", { month: "long", year: "numeric" });
}

function formatSettledDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("default", {
    month: "short",
    day: "numeric",
  });
}

export function SettlementHistory({
  settlements,
  currentUserId,
  partnerName,
}: SettlementHistoryProps) {
  if (settlements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Past Settlements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-4">No past settlements</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Past Settlements
        </CardTitle>
        <CardDescription>Your settlement history</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {settlements.map((settlement) => {
          // Determine who owed whom based on stored data
          const isUserA = settlement.user_a_id === currentUserId;
          const myPaid = isUserA ? settlement.user_a_paid : settlement.user_b_paid;
          const partnerPaid = isUserA
            ? settlement.user_b_paid
            : settlement.user_a_paid;

          const fairShare = Number(settlement.total_joint) / 2;
          const balance = myPaid - fairShare;
          const absBalance = Math.abs(balance);
          const isSquared = absBalance < 0.01;

          let settlementText = "";
          let textColor = "text-gray-600";

          if (isSquared) {
            settlementText = "Squared up";
            textColor = "text-green-600";
          } else if (balance > 0) {
            settlementText = `${partnerName} owed you ${formatCurrency(absBalance)}`;
            textColor = "text-purple-600";
          } else {
            settlementText = `You owed ${partnerName} ${formatCurrency(absBalance)}`;
            textColor = "text-orange-600";
          }

          return (
            <div
              key={settlement.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {formatMonthName(settlement.month)}
                </p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(Number(settlement.total_joint))} total
                </p>
                <p className={`text-sm ${textColor}`}>{settlementText}</p>
              </div>
              <div className="text-right">
                {settlement.settled_at && (
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <Check className="h-4 w-4" />
                    <span>Settled {formatSettledDate(settlement.settled_at)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
