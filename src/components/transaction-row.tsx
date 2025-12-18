"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Transaction, Category } from "@/types";
import { toast } from "sonner";
import { broadcastTransactionUpdate } from "@/hooks/use-realtime-transactions";

interface TransactionRowProps {
  transaction: Transaction;
  category: Category | null;
  ownerName: string;
}

// Category color mapping for system categories (fallback styles)
const getCategoryStyle = (categoryName: string) => {
  const styles: Record<string, { bg: string; text: string }> = {
    groceries: { bg: "bg-green-100", text: "text-green-700" },
    "dining out": { bg: "bg-orange-100", text: "text-orange-700" },
    transportation: { bg: "bg-blue-100", text: "text-blue-700" },
    shopping: { bg: "bg-purple-100", text: "text-purple-700" },
    "bills & utilities": { bg: "bg-yellow-100", text: "text-yellow-700" },
    entertainment: { bg: "bg-pink-100", text: "text-pink-700" },
    healthcare: { bg: "bg-cyan-100", text: "text-cyan-700" },
    travel: { bg: "bg-amber-100", text: "text-amber-700" },
    "personal care": { bg: "bg-lime-100", text: "text-lime-700" },
    other: { bg: "bg-slate-100", text: "text-slate-700" },
    uncategorized: { bg: "bg-gray-100", text: "text-gray-500" },
  };

  return styles[categoryName.toLowerCase()] || styles.uncategorized;
};

// Convert hex color to Tailwind-compatible bg/text classes
const getCustomCategoryStyle = (color: string | null) => {
  // Map hex colors to approximate Tailwind classes
  const colorMap: Record<string, { bg: string; text: string }> = {
    "#8B5CF6": { bg: "bg-violet-100", text: "text-violet-700" },
    "#3B82F6": { bg: "bg-blue-100", text: "text-blue-700" },
    "#10B981": { bg: "bg-emerald-100", text: "text-emerald-700" },
    "#F59E0B": { bg: "bg-amber-100", text: "text-amber-700" },
    "#EF4444": { bg: "bg-red-100", text: "text-red-700" },
    "#EC4899": { bg: "bg-pink-100", text: "text-pink-700" },
    "#6366F1": { bg: "bg-indigo-100", text: "text-indigo-700" },
    "#14B8A6": { bg: "bg-teal-100", text: "text-teal-700" },
    "#84CC16": { bg: "bg-lime-100", text: "text-lime-700" },
    "#F97316": { bg: "bg-orange-100", text: "text-orange-700" },
    "#06B6D4": { bg: "bg-cyan-100", text: "text-cyan-700" },
    "#A855F7": { bg: "bg-purple-100", text: "text-purple-700" },
  };

  return colorMap[color || ""] || { bg: "bg-violet-100", text: "text-violet-700" };
};

// Get default icon for system categories
const getDefaultIcon = (categoryName: string) => {
  const icons: Record<string, string> = {
    groceries: "🛒",
    "dining out": "🍽️",
    transportation: "🚗",
    shopping: "🛍️",
    "bills & utilities": "💡",
    entertainment: "🎬",
    healthcare: "⚕️",
    travel: "✈️",
    "personal care": "💇",
    other: "📦",
    uncategorized: "❓",
  };

  return icons[categoryName.toLowerCase()] || "❓";
};

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export function TransactionRow({ transaction, category, ownerName }: TransactionRowProps) {
  const router = useRouter();

  // Local state for optimistic updates
  const [isJoint, setIsJoint] = useState(transaction.is_joint);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync local state when prop changes (e.g., after router.refresh())
  useEffect(() => {
    setIsJoint(transaction.is_joint);
  }, [transaction.is_joint]);

  const categoryName = category?.name || "Uncategorized";

  // Use custom category style if category has a color, otherwise fall back to name-based style
  const categoryStyle = category?.color
    ? getCustomCategoryStyle(category.color)
    : getCategoryStyle(category?.name || "uncategorized");

  // Use the icon from the database, or fall back to a default based on category name
  const categoryIcon = category?.icon || getDefaultIcon(category?.name || "uncategorized");

  const handleToggleJoint = async () => {
    const previousValue = isJoint;
    const newValue = !isJoint;

    // Optimistic update - update UI immediately
    setIsJoint(newValue);
    setIsUpdating(true);

    try {
      const response = await fetch("/api/transactions/toggle-joint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId: transaction.id,
          isJoint: newValue,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update");
      }

      // Broadcast the update to other clients
      broadcastTransactionUpdate("UPDATE", transaction.id);

      // Refresh to update spending cards (server-calculated)
      router.refresh();

      // Success - show subtle feedback
      toast.success(
        newValue ? "Marked as Joint expense" : "Marked as Personal expense",
        { duration: 2000 }
      );
    } catch (error) {
      // Revert on error
      setIsJoint(previousValue);
      toast.error("Failed to update. Please try again.");
      console.error("Toggle error:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
      <div className="flex items-center gap-3">
        {/* Category Emoji Icon */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${categoryStyle.bg}`}
        >
          <span className="text-lg">{categoryIcon}</span>
        </div>
        <div>
          <p className="font-medium text-slate-900">
            {transaction.merchant_name || transaction.description}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {/* Category Badge */}
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${categoryStyle.bg} ${categoryStyle.text}`}
            >
              {categoryName}
            </span>
            {/* Personal/Joint Toggle Button */}
            <button
              onClick={handleToggleJoint}
              disabled={isUpdating}
              className={`text-xs px-2 py-0.5 rounded-full transition-all ${
                isUpdating
                  ? "opacity-50 cursor-wait"
                  : "cursor-pointer hover:ring-2 hover:ring-offset-1"
              } ${
                isJoint
                  ? "bg-purple-100 text-purple-700 hover:ring-purple-300"
                  : "bg-slate-100 text-slate-600 hover:ring-slate-300"
              }`}
            >
              {isJoint ? "👥 Joint" : "👤 Personal"}
            </button>
            {/* Owner Indicator */}
            <span className="text-xs text-slate-400">
              • {ownerName}
            </span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-slate-900">
          -{formatAmount(Number(transaction.amount))}
        </p>
        {/* Show raw description if different from merchant name */}
        {transaction.description !== transaction.merchant_name && (
          <p className="text-xs text-slate-400 max-w-[150px] truncate">
            {transaction.description}
          </p>
        )}
      </div>
    </div>
  );
}
