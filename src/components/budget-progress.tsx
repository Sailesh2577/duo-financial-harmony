"use client";

import { cn } from "@/lib/utils";

interface BudgetProgressProps {
  spent: number;
  limit: number;
  alertThreshold?: number;
  showAmount?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BudgetProgress({
  spent,
  limit,
  alertThreshold = 80,
  showAmount = true,
  size = "md",
  className,
}: BudgetProgressProps) {
  // Calculate percentage (cap at 100% for visual, but allow overflow for color)
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
  const visualPercentage = Math.min(percentage, 100);

  // Determine color based on percentage
  const getProgressColor = () => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= alertThreshold) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getTextColor = () => {
    if (percentage >= 100) return "text-red-600";
    if (percentage >= alertThreshold) return "text-yellow-600";
    return "text-green-600";
  };

  // Size variants
  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Progress bar */}
      <div
        className={cn(
          "w-full bg-gray-200 rounded-full overflow-hidden",
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            getProgressColor()
          )}
          style={{ width: `${visualPercentage}%` }}
        />
      </div>

      {/* Amount display */}
      {showAmount && (
        <div className="flex justify-between items-center mt-1">
          <span className={cn("text-xs font-medium", getTextColor())}>
            {formatCurrency(spent)} / {formatCurrency(limit)}
          </span>
          <span className={cn("text-xs font-medium", getTextColor())}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}
