"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  X,
  Calendar,
  ChevronDown,
  Filter,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Category, Transaction } from "@/types";
import { useDebounce } from "@/hooks/use-debounce";
import { useTransactionFilters } from "@/hooks/use-transaction-filters";
import {
  DateRangePreset,
  TransactionType,
  ActiveFilter,
  defaultFilters,
} from "@/types/filters";
import {
  getDateRangeLabel,
  formatDateDisplay,
  filterTransactions,
} from "@/lib/filter-utils";

interface TransactionFiltersProps {
  categories: Category[];
  transactions: Transaction[];
  onFilteredTransactionsChange: (filtered: Transaction[]) => void;
}

export function TransactionFilters({
  categories,
  transactions,
  onFilteredTransactionsChange,
}: TransactionFiltersProps) {
  const {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    removeFilter,
    hasActiveFilters,
  } = useTransactionFilters();

  // Local state for search input (before debounce)
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Ref to track intentional clears (prevents debounce from re-adding cleared search)
  const isSearchCleared = useRef(false);

  // Amount range popover state
  const [amountOpen, setAmountOpen] = useState(false);
  const [localAmountMin, setLocalAmountMin] = useState<string>(
    filters.amountMin?.toString() || ""
  );
  const [localAmountMax, setLocalAmountMax] = useState<string>(
    filters.amountMax?.toString() || ""
  );

  // Custom date range popover state
  const [dateOpen, setDateOpen] = useState(false);
  const [localStartDate, setLocalStartDate] = useState(filters.startDate || "");
  const [localEndDate, setLocalEndDate] = useState(filters.endDate || "");

  // Sync debounced search to URL (with guard for intentional clears)
  useEffect(() => {
    // Skip if this was an intentional clear
    if (isSearchCleared.current) {
      // Reset the flag once debounce catches up (input is empty)
      if (debouncedSearch === "") {
        isSearchCleared.current = false;
      }
      return;
    }

    // Only update URL if debounced value differs from current filter
    if (debouncedSearch !== filters.search) {
      setFilter("search", debouncedSearch);
    }
  }, [debouncedSearch, filters.search, setFilter]);

  // Apply filters and notify parent
  useEffect(() => {
    const filtered = filterTransactions(transactions, filters);
    onFilteredTransactionsChange(filtered);
  }, [transactions, filters, onFilteredTransactionsChange]);

  // Build active filter chips
  const activeFilters: ActiveFilter[] = useMemo(() => {
    const chips: ActiveFilter[] = [];

    if (filters.search) {
      chips.push({
        key: "search",
        label: "Search",
        value: `"${filters.search}"`,
      });
    }

    if (filters.dateRange !== defaultFilters.dateRange) {
      if (
        filters.dateRange === "custom" &&
        filters.startDate &&
        filters.endDate
      ) {
        chips.push({
          key: "dateRange",
          label: "Date",
          value: `${formatDateDisplay(filters.startDate)} - ${formatDateDisplay(
            filters.endDate
          )}`,
        });
      } else {
        chips.push({
          key: "dateRange",
          label: "Date",
          value: getDateRangeLabel(filters.dateRange),
        });
      }
    }

    if (filters.categoryId) {
      const category = categories.find((c) => c.id === filters.categoryId);
      if (category) {
        chips.push({
          key: "categoryId",
          label: "Category",
          value: `${category.icon} ${category.name}`,
        });
      }
    }

    if (filters.type !== defaultFilters.type) {
      chips.push({
        key: "type",
        label: "Type",
        value: filters.type === "joint" ? "Joint" : "Personal",
      });
    }

    if (filters.amountMin !== null || filters.amountMax !== null) {
      let value = "";
      if (filters.amountMin !== null && filters.amountMax !== null) {
        value = `$${filters.amountMin} - $${filters.amountMax}`;
      } else if (filters.amountMin !== null) {
        value = `≥ $${filters.amountMin}`;
      } else {
        value = `≤ $${filters.amountMax}`;
      }
      chips.push({
        key: "amountMin",
        label: "Amount",
        value,
      });
    }

    return chips;
  }, [filters, categories]);

  // Handle date range preset change
  const handleDateRangeChange = (value: string) => {
    if (value === "custom") {
      setDateOpen(true);
    } else {
      setFilters({
        dateRange: value as DateRangePreset,
        startDate: null,
        endDate: null,
      });
    }
  };

  // Apply custom date range
  const applyCustomDateRange = () => {
    if (localStartDate && localEndDate) {
      setFilters({
        dateRange: "custom",
        startDate: localStartDate,
        endDate: localEndDate,
      });
      setDateOpen(false);
    }
  };

  // Apply amount range
  const applyAmountRange = () => {
    setFilters({
      amountMin: localAmountMin ? parseFloat(localAmountMin) : null,
      amountMax: localAmountMax ? parseFloat(localAmountMax) : null,
    });
    setAmountOpen(false);
  };

  // Clear amount range
  const clearAmountRange = () => {
    setLocalAmountMin("");
    setLocalAmountMax("");
    setFilters({ amountMin: null, amountMax: null });
    setAmountOpen(false);
  };

  // Handle clearing search - sets flag to prevent debounce from re-adding
  const handleClearSearch = () => {
    isSearchCleared.current = true;
    setSearchInput("");
    setFilter("search", "");
  };

  // Handle clearing all filters
  const handleClearAll = () => {
    isSearchCleared.current = true;
    setSearchInput("");
    setLocalAmountMin("");
    setLocalAmountMax("");
    setLocalStartDate("");
    setLocalEndDate("");
    clearFilters();
  };

  // Get filtered count
  const filteredCount = filterTransactions(transactions, filters).length;
  const totalCount = transactions.length;

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          placeholder="Search transactions..."
          value={searchInput}
          onChange={(e) => {
            // Reset the clear flag when user starts typing again
            isSearchCleared.current = false;
            setSearchInput(e.target.value);
          }}
          className="pl-10 pr-10 bg-white border-slate-200 focus:border-violet-500 focus:ring-violet-500"
        />
        {searchInput && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Range Filter */}
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-slate-200 bg-white hover:bg-slate-50"
            >
              <Calendar className="mr-2 h-4 w-4 text-slate-500" />
              {filters.dateRange === "custom" && filters.startDate
                ? "Custom"
                : getDateRangeLabel(filters.dateRange)}
              <ChevronDown className="ml-2 h-4 w-4 text-slate-400" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-2 border-b border-slate-100">
              <Select
                value={filters.dateRange}
                onValueChange={handleDateRangeChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                  <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range...</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Custom Date Inputs */}
            <div className="p-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">From</Label>
                <Input
                  type="date"
                  value={localStartDate}
                  onChange={(e) => setLocalStartDate(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">To</Label>
                <Input
                  type="date"
                  value={localEndDate}
                  onChange={(e) => setLocalEndDate(e.target.value)}
                  className="h-9"
                />
              </div>
              <Button
                size="sm"
                onClick={applyCustomDateRange}
                disabled={!localStartDate || !localEndDate}
                className="w-full bg-violet-600 hover:bg-violet-700"
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Category Filter */}
        <Select
          value={filters.categoryId || "all"}
          onValueChange={(value) =>
            setFilter("categoryId", value === "all" ? null : value)
          }
        >
          <SelectTrigger className="h-9 w-auto min-w-[140px] border-slate-200 bg-white">
            <Filter className="mr-2 h-4 w-4 text-slate-500" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <span className="flex items-center gap-2">
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select
          value={filters.type}
          onValueChange={(value) => setFilter("type", value as TransactionType)}
        >
          <SelectTrigger className="h-9 w-auto min-w-[110px] border-slate-200 bg-white">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="personal">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                Personal
              </span>
            </SelectItem>
            <SelectItem value="joint">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                Joint
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Amount Range Filter */}
        <Popover open={amountOpen} onOpenChange={setAmountOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-slate-200 bg-white hover:bg-slate-50"
            >
              <DollarSign className="mr-1 h-4 w-4 text-slate-500" />
              Amount
              {(filters.amountMin !== null || filters.amountMax !== null) && (
                <span className="ml-1 text-violet-600">•</span>
              )}
              <ChevronDown className="ml-2 h-4 w-4 text-slate-400" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Minimum ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={localAmountMin}
                  onChange={(e) => setLocalAmountMin(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Maximum ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="No limit"
                  value={localAmountMax}
                  onChange={(e) => setLocalAmountMax(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAmountRange}
                  className="flex-1"
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={applyAmountRange}
                  className="flex-1 bg-violet-600 hover:bg-violet-700"
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear All Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-9 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="mr-1 h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Active:</span>
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="bg-violet-50 text-violet-700 hover:bg-violet-100 cursor-pointer pr-1.5"
              onClick={() => {
                if (filter.key === "search") {
                  // Use the same clear handler to properly clear search
                  handleClearSearch();
                } else if (filter.key === "amountMin") {
                  setLocalAmountMin("");
                  setLocalAmountMax("");
                  setFilters({ amountMin: null, amountMax: null });
                } else if (filter.key === "dateRange") {
                  setLocalStartDate("");
                  setLocalEndDate("");
                  removeFilter("dateRange");
                } else {
                  removeFilter(filter.key);
                }
              }}
            >
              {filter.value}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* Result Count */}
      <div className="text-sm text-slate-500">
        Showing {filteredCount.toLocaleString()} of{" "}
        {totalCount.toLocaleString()} transaction{totalCount !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
