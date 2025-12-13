"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface Budget {
  id: string;
  category_id: string | null;
  monthly_limit: number;
  alert_threshold: number;
  categories?: {
    name: string;
    icon: string | null;
  } | null;
}

interface BudgetAlertProviderProps {
  budgets: Budget[];
  spendingByCategory: Record<string, number>;
  totalSpending: number;
  children: React.ReactNode;
}

export function BudgetAlertProvider({
  budgets,
  spendingByCategory,
  totalSpending,
  children,
}: BudgetAlertProviderProps) {
  const alertedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    budgets.forEach((budget) => {
      const spent = budget.category_id
        ? spendingByCategory[budget.category_id] || 0
        : totalSpending;

      const percentage = (spent / budget.monthly_limit) * 100;
      const budgetKey = budget.id;

      // Don't re-alert in the same session
      if (alertedRef.current.has(budgetKey)) return;

      const budgetName = budget.category_id
        ? budget.categories?.name || "Category"
        : "Total Household";

      const icon = budget.category_id ? budget.categories?.icon || "📁" : "💰";

      if (percentage >= 100) {
        toast.error(`${icon} Budget Exceeded!`, {
          description: `${budgetName} has exceeded ${formatCurrency(
            budget.monthly_limit
          )}`,
          duration: 8000,
        });
        alertedRef.current.add(budgetKey);
      } else if (percentage >= budget.alert_threshold) {
        toast.warning(`${icon} Budget Warning`, {
          description: `${budgetName} is at ${percentage.toFixed(
            0
          )}% (${formatCurrency(spent)} of ${formatCurrency(
            budget.monthly_limit
          )})`,
          duration: 6000,
        });
        alertedRef.current.add(budgetKey);
      }
    });
  }, [budgets, spendingByCategory, totalSpending]);

  return <>{children}</>;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
