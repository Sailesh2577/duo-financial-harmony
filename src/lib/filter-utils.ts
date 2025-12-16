import { Transaction } from "@/types";
import { FilterState, DateRangePreset } from "@/types/filters";

/**
 * Get today's date as YYYY-MM-DD string in local timezone
 */
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get date range bounds for a preset as YYYY-MM-DD strings
 * Using strings avoids timezone issues when comparing dates
 */
export function getDateRangeBounds(preset: DateRangePreset): {
  start: string;
  end: string;
} {
  const now = new Date();
  const end = getLocalDateString(now);

  switch (preset) {
    case "this-month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: getLocalDateString(start), end };
    }
    case "last-month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: getLocalDateString(start), end: getLocalDateString(monthEnd) };
    }
    case "last-3-months": {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { start: getLocalDateString(start), end };
    }
    case "last-6-months": {
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      return { start: getLocalDateString(start), end };
    }
    case "this-year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start: getLocalDateString(start), end };
    }
    case "custom":
    default:
      // For custom, return full year as fallback (will be overridden by custom dates)
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return { start: getLocalDateString(yearStart), end };
  }
}

/**
 * Get human-readable label for a date range preset
 */
export function getDateRangeLabel(preset: DateRangePreset): string {
  switch (preset) {
    case "this-month":
      return "This Month";
    case "last-month":
      return "Last Month";
    case "last-3-months":
      return "Last 3 Months";
    case "last-6-months":
      return "Last 6 Months";
    case "this-year":
      return "This Year";
    case "custom":
      return "Custom Range";
    default:
      return "All Time";
  }
}

/**
 * Filter transactions based on filter state
 * Uses AND logic - all conditions must match
 */
export function filterTransactions(
  transactions: Transaction[],
  filters: FilterState
): Transaction[] {
  return transactions.filter((txn) => {
    // Search filter (merchant_name or description)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const merchantMatch = txn.merchant_name
        ?.toLowerCase()
        .includes(searchLower);
      const descriptionMatch = txn.description
        ?.toLowerCase()
        .includes(searchLower);
      if (!merchantMatch && !descriptionMatch) {
        return false;
      }
    }

    // Date range filter - use string comparison (YYYY-MM-DD format)
    // This avoids timezone issues since transaction dates are stored as date-only strings
    const txnDate = txn.date; // Already in YYYY-MM-DD format
    if (
      filters.dateRange === "custom" &&
      filters.startDate &&
      filters.endDate
    ) {
      if (txnDate < filters.startDate || txnDate > filters.endDate) {
        return false;
      }
    } else if (filters.dateRange !== "custom") {
      const { start, end } = getDateRangeBounds(filters.dateRange);
      if (txnDate < start || txnDate > end) {
        return false;
      }
    }

    // Category filter
    if (filters.categoryId && txn.category_id !== filters.categoryId) {
      return false;
    }

    // Type filter (Personal / Joint)
    if (filters.type === "personal" && txn.is_joint) {
      return false;
    }
    if (filters.type === "joint" && !txn.is_joint) {
      return false;
    }

    // Amount range filters
    if (
      filters.amountMin !== null &&
      Math.abs(txn.amount) < filters.amountMin
    ) {
      return false;
    }
    if (
      filters.amountMax !== null &&
      Math.abs(txn.amount) > filters.amountMax
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Format date for display in custom date picker
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format date for display (e.g., "Dec 15, 2025")
 */
export function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
