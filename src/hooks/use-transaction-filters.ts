"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  FilterState,
  DateRangePreset,
  TransactionType,
  defaultFilters,
  FILTER_PARAMS,
} from "@/types/filters";

/**
 * Custom hook to manage transaction filter state via URL search params.
 * Provides functions to update individual filters and clear all filters.
 * Filter state persists across page refreshes and can be shared via URL.
 */
export function useTransactionFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse current filter state from URL search params
  const filters: FilterState = useMemo(() => {
    const search = searchParams.get(FILTER_PARAMS.SEARCH) || "";
    const dateRange =
      (searchParams.get(FILTER_PARAMS.DATE_RANGE) as DateRangePreset) ||
      defaultFilters.dateRange;
    const startDate = searchParams.get(FILTER_PARAMS.START_DATE) || null;
    const endDate = searchParams.get(FILTER_PARAMS.END_DATE) || null;
    const categoryId = searchParams.get(FILTER_PARAMS.CATEGORY) || null;
    const type =
      (searchParams.get(FILTER_PARAMS.TYPE) as TransactionType) ||
      defaultFilters.type;
    const amountMinStr = searchParams.get(FILTER_PARAMS.AMOUNT_MIN);
    const amountMaxStr = searchParams.get(FILTER_PARAMS.AMOUNT_MAX);
    const amountMin = amountMinStr ? parseFloat(amountMinStr) : null;
    const amountMax = amountMaxStr ? parseFloat(amountMaxStr) : null;

    return {
      search,
      dateRange,
      startDate,
      endDate,
      categoryId,
      type,
      amountMin,
      amountMax,
    };
  }, [searchParams]);

  // Helper to create new URLSearchParams with updated values
  const createQueryString = useCallback(
    (updates: Partial<FilterState>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Apply updates to params
      Object.entries(updates).forEach(([key, value]) => {
        const paramKey = getParamKey(key as keyof FilterState);
        if (paramKey) {
          if (
            value === null ||
            value === undefined ||
            value === "" ||
            value === defaultFilters[key as keyof FilterState]
          ) {
            params.delete(paramKey);
          } else {
            params.set(paramKey, String(value));
          }
        }
      });

      return params.toString();
    },
    [searchParams]
  );

  // Update a single filter
  const setFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      const queryString = createQueryString({ [key]: value });
      router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, {
        scroll: false,
      });
    },
    [createQueryString, pathname, router]
  );

  // Update multiple filters at once
  const setFilters = useCallback(
    (updates: Partial<FilterState>) => {
      const queryString = createQueryString(updates);
      router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, {
        scroll: false,
      });
    },
    [createQueryString, pathname, router]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  // Remove a specific filter
  const removeFilter = useCallback(
    (key: keyof FilterState) => {
      const params = new URLSearchParams(searchParams.toString());
      const paramKey = getParamKey(key);
      if (paramKey) {
        params.delete(paramKey);
      }
      // If removing custom dates, also reset dateRange
      if (key === "startDate" || key === "endDate") {
        params.delete(FILTER_PARAMS.START_DATE);
        params.delete(FILTER_PARAMS.END_DATE);
        params.delete(FILTER_PARAMS.DATE_RANGE);
      }
      const queryString = params.toString();
      router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== "" ||
      filters.dateRange !== defaultFilters.dateRange ||
      filters.categoryId !== null ||
      filters.type !== defaultFilters.type ||
      filters.amountMin !== null ||
      filters.amountMax !== null
    );
  }, [filters]);

  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    removeFilter,
    hasActiveFilters,
  };
}

// Helper to map FilterState keys to URL param keys
function getParamKey(key: keyof FilterState): string | null {
  const mapping: Record<keyof FilterState, string> = {
    search: FILTER_PARAMS.SEARCH,
    dateRange: FILTER_PARAMS.DATE_RANGE,
    startDate: FILTER_PARAMS.START_DATE,
    endDate: FILTER_PARAMS.END_DATE,
    categoryId: FILTER_PARAMS.CATEGORY,
    type: FILTER_PARAMS.TYPE,
    amountMin: FILTER_PARAMS.AMOUNT_MIN,
    amountMax: FILTER_PARAMS.AMOUNT_MAX,
  };
  return mapping[key] || null;
}
