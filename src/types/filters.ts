// Transaction Filter Types
// These types define the filter state for transaction search and filtering

export type DateRangePreset =
  | "this-month"
  | "last-month"
  | "last-3-months"
  | "last-6-months"
  | "this-year"
  | "custom";

export type TransactionType = "all" | "personal" | "joint";

export interface FilterState {
  search: string;
  dateRange: DateRangePreset;
  startDate: string | null; // ISO date string for custom range
  endDate: string | null; // ISO date string for custom range
  categoryId: string | null; // null = all categories
  type: TransactionType;
  amountMin: number | null;
  amountMax: number | null;
}

export const defaultFilters: FilterState = {
  search: "",
  dateRange: "this-month",
  startDate: null,
  endDate: null,
  categoryId: null,
  type: "all",
  amountMin: null,
  amountMax: null,
};

// URL search param keys
export const FILTER_PARAMS = {
  SEARCH: "q",
  DATE_RANGE: "range",
  START_DATE: "from",
  END_DATE: "to",
  CATEGORY: "category",
  TYPE: "type",
  AMOUNT_MIN: "min",
  AMOUNT_MAX: "max",
} as const;

// Helper type for filter chips display
export interface ActiveFilter {
  key: keyof FilterState;
  label: string;
  value: string;
}
