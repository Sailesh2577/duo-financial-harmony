"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale, Check, Users } from "lucide-react";

interface SettlementSummaryProps {
  monthName: string;
  monthKey: string; // e.g., "2025-12-01"
  jointTotal: number;
  myContribution: number;
  partnerContribution: number;
  balance: number; // positive = partner owes me, negative = I owe partner
  partnerName: string;
  hasPartner: boolean;
  isSettled: boolean;
  currentUserId: string;
  partnerId: string | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function SettlementSummary({
  monthName,
  monthKey,
  jointTotal,
  myContribution,
  partnerContribution,
  balance,
  partnerName,
  hasPartner,
  isSettled,
  currentUserId,
  partnerId,
}: SettlementSummaryProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Calculate percentages
  const myPercentage = jointTotal > 0 ? (myContribution / jointTotal) * 100 : 0;
  const partnerPercentage =
    jointTotal > 0 ? (partnerContribution / jointTotal) * 100 : 0;

  // Determine who owes whom
  const absBalance = Math.abs(balance);
  const partnerOwesMe = balance > 0;
  const isSquared = absBalance < 0.01; // Less than 1 cent

  const handleSettle = async () => {
    if (!partnerId) {
      toast.error("You need a partner to settle expenses");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/settlement/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: monthKey,
          total_joint: jointTotal,
          user_a_id: currentUserId,
          user_a_paid: myContribution,
          user_b_id: partnerId,
          user_b_paid: partnerContribution,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to settle");
      }

      toast.success("Month marked as settled!");
      router.refresh();
    } catch (error) {
      console.error("Error settling:", error);
      toast.error("Failed to mark as settled. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // No partner state
  if (!hasPartner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            {monthName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Invite your partner to start tracking joint expenses</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No joint expenses state
  if (jointTotal === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            {monthName}
          </CardTitle>
          <CardDescription>Monthly settlement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>No joint expenses yet this month</p>
            <p className="text-sm mt-2">
              Mark transactions as &quot;Joint&quot; to split them with{" "}
              {partnerName}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          {monthName}
        </CardTitle>
        <CardDescription>Monthly settlement</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Joint Total */}
        <div className="text-center">
          <p className="text-sm text-gray-500">Joint Expenses Total</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(jointTotal)}
          </p>
        </div>

        {/* Contribution Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* My Contribution */}
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-600 font-medium">You paid</p>
            <p className="text-xl font-bold text-blue-700">
              {formatCurrency(myContribution)}
            </p>
            <p className="text-sm text-blue-500">({myPercentage.toFixed(0)}%)</p>
          </div>

          {/* Partner Contribution */}
          <div className="bg-emerald-50 rounded-lg p-4 text-center">
            <p className="text-sm text-emerald-600 font-medium">
              {partnerName} paid
            </p>
            <p className="text-xl font-bold text-emerald-700">
              {formatCurrency(partnerContribution)}
            </p>
            <p className="text-sm text-emerald-500">
              ({partnerPercentage.toFixed(0)}%)
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t-2 border-gray-200" />

        {/* Settlement Result */}
        <div className="text-center">
          {isSquared ? (
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-lg font-semibold text-green-700">
                You&apos;re all squared up!
              </p>
            </div>
          ) : partnerOwesMe ? (
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600">
                {partnerName} owes you
              </p>
              <p className="text-2xl font-bold text-purple-700">
                {formatCurrency(absBalance)}
              </p>
            </div>
          ) : (
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm text-orange-600">
                You owe {partnerName}
              </p>
              <p className="text-2xl font-bold text-orange-700">
                {formatCurrency(absBalance)}
              </p>
            </div>
          )}
        </div>

        {/* Settle Button */}
        {isSettled ? (
          <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 rounded-lg py-3">
            <Check className="h-5 w-5" />
            <span className="font-medium">Settled</span>
          </div>
        ) : (
          <Button
            onClick={handleSettle}
            disabled={isLoading || isSquared}
            className="w-full"
            size="lg"
          >
            {isLoading ? "Marking as Settled..." : "Mark as Settled"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
