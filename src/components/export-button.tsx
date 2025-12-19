"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getDateRangeBounds } from "@/lib/filter-utils";
import { DateRangePreset } from "@/types/filters";

type ExportDateRange = "this-month" | "last-month" | "last-3-months" | "custom";
type ExportType = "all" | "joint" | "personal";

export function ExportButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<ExportDateRange>("this-month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [transactionType, setTransactionType] = useState<ExportType>("all");

  const resetForm = () => {
    setDateRange("this-month");
    setCustomStart("");
    setCustomEnd("");
    setTransactionType("all");
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const handleExport = async () => {
    // Get date range
    let start: string;
    let end: string;

    if (dateRange === "custom") {
      if (!customStart || !customEnd) {
        toast.error("Please select both start and end dates");
        return;
      }
      start = customStart;
      end = customEnd;
    } else {
      const bounds = getDateRangeBounds(dateRange as DateRangePreset);
      start = bounds.start;
      end = bounds.end;
    }

    setLoading(true);

    try {
      // Build URL with params
      const params = new URLSearchParams({
        start,
        end,
        type: transactionType,
      });

      const response = await fetch(`/api/transactions/export?${params}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to export transactions");
      }

      // Get the blob and trigger download
      const blob = await response.blob();
      const filename =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+)"/)?.[1] ||
        `duo-transactions-${start}-to-${end}.csv`;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Transactions exported successfully!");
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error("Export error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to export transactions"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 border-slate-200 bg-white hover:bg-slate-50"
        >
          <Download className="mr-2 h-4 w-4 text-slate-500" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Transactions</DialogTitle>
          <DialogDescription>
            Download your transaction history as a CSV file for Excel or Google
            Sheets.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Date Range Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Date Range</Label>
            <RadioGroup
              value={dateRange}
              onValueChange={(value) => setDateRange(value as ExportDateRange)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="this-month" id="this-month" />
                <Label htmlFor="this-month" className="font-normal cursor-pointer">
                  This Month
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="last-month" id="last-month" />
                <Label htmlFor="last-month" className="font-normal cursor-pointer">
                  Last Month
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="last-3-months" id="last-3-months" />
                <Label htmlFor="last-3-months" className="font-normal cursor-pointer">
                  Last 3 Months
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-normal cursor-pointer">
                  Custom Range
                </Label>
              </div>
            </RadioGroup>

            {/* Custom Date Inputs */}
            {dateRange === "custom" && (
              <div className="grid grid-cols-2 gap-3 pt-2 pl-6">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">From</Label>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">To</Label>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Transaction Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Transaction Type</Label>
            <RadioGroup
              value={transactionType}
              onValueChange={(value) => setTransactionType(value as ExportType)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="type-all" />
                <Label htmlFor="type-all" className="font-normal cursor-pointer">
                  All Transactions
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="joint" id="type-joint" />
                <Label htmlFor="type-joint" className="font-normal cursor-pointer">
                  Joint Only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="personal" id="type-personal" />
                <Label htmlFor="type-personal" className="font-normal cursor-pointer">
                  Personal Only
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={loading}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {loading ? (
              <>
                <Download className="mr-2 h-4 w-4 animate-pulse" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
