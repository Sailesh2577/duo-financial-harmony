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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BudgetProgress } from "@/components/budget-progress";
import { Trash2, Plus, DollarSign, Target } from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface Budget {
  id: string;
  category_id: string | null;
  monthly_limit: number;
  alert_threshold: number | null;
  categories?: Category | null;
}

interface BudgetSettingsProps {
  categories: Category[];
  existingBudgets: Budget[];
  spendingByCategory: Record<string, number>;
  totalSpending: number;
}

export function BudgetSettings({
  categories,
  existingBudgets,
  spendingByCategory,
  totalSpending,
}: BudgetSettingsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state for new budget
  const [newBudget, setNewBudget] = useState({
    category_id: "" as string | "total" | "joint",
    monthly_limit: "",
    alert_threshold: "80",
  });

  // Find the "total" budget (category_id is null)
  const totalBudget = existingBudgets.find((b) => b.category_id === null);
  const categoryBudgets = existingBudgets.filter((b) => b.category_id !== null);

  // Get categories that don't have a budget yet
  const availableCategories = categories.filter(
    (cat) => !categoryBudgets.some((b) => b.category_id === cat.id)
  );

  const handleSaveBudget = async () => {
    if (!newBudget.monthly_limit || parseFloat(newBudget.monthly_limit) <= 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/settings/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id:
            newBudget.category_id === "total" ||
            newBudget.category_id === "joint"
              ? null
              : newBudget.category_id || null,
          monthly_limit: parseFloat(newBudget.monthly_limit),
          alert_threshold: parseInt(newBudget.alert_threshold),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save budget");
      }

      toast.success("Budget saved successfully!");
      setShowAddForm(false);
      setNewBudget({
        category_id: "",
        monthly_limit: "",
        alert_threshold: "80",
      });
      router.refresh();
    } catch (error) {
      console.error("Error saving budget:", error);
      toast.error("Failed to save budget. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    if (!confirm("Are you sure you want to delete this budget?")) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/settings/budgets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget_id: budgetId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete budget");
      }

      toast.success("Budget deleted");
      router.refresh();
    } catch (error) {
      console.error("Error deleting budget:", error);
      toast.error("Failed to delete budget. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // const formatCurrency = (amount: number) => {
  //   return new Intl.NumberFormat("en-US", {
  //     style: "currency",
  //     currency: "USD",
  //     minimumFractionDigits: 0,
  //     maximumFractionDigits: 0,
  //   }).format(amount);
  // };

  // Get days remaining in month
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysRemaining = lastDay.getDate() - now.getDate();

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Monthly Budgets
          </CardTitle>
          <CardDescription>
            Set spending limits and get alerts when you&apos;re approaching
            them.
            {daysRemaining > 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                {daysRemaining} days left in this month
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Total Household Budget */}
          {totalBudget ? (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-purple-900">
                    Total Household Budget
                  </h3>
                  <p className="text-sm text-purple-700">
                    All spending combined
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteBudget(totalBudget.id)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
              <BudgetProgress
                spent={totalSpending}
                limit={totalBudget.monthly_limit}
                alertThreshold={totalBudget.alert_threshold ?? 80}
                size="lg"
              />
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
              <p className="text-gray-600 mb-2">
                No total household budget set
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewBudget({
                    category_id: "total",
                    monthly_limit: "",
                    alert_threshold: "80",
                  });
                  setShowAddForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Set Total Budget
              </Button>
            </div>
          )}

          {/* Category Budgets */}
          {categoryBudgets.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Category Budgets</h3>
              {categoryBudgets.map((budget) => {
                const categorySpent = budget.category_id
                  ? spendingByCategory[budget.category_id] || 0
                  : 0;

                return (
                  <div
                    key={budget.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {budget.categories?.icon || "📁"}
                        </span>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {budget.categories?.name || "Unknown Category"}
                          </h4>
                          <p className="text-xs text-gray-500">
                            Alert at {budget.alert_threshold}%
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBudget(budget.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    <BudgetProgress
                      spent={categorySpent}
                      limit={budget.monthly_limit}
                      alertThreshold={budget.alert_threshold ?? 80}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Add New Budget Form */}
          {showAddForm ? (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">Add New Budget</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Budget Type/Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Budget For</Label>
                  <Select
                    value={newBudget.category_id}
                    onValueChange={(value) =>
                      setNewBudget({ ...newBudget, category_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {!totalBudget && (
                        <SelectItem value="total">
                          💰 Total Household Budget
                        </SelectItem>
                      )}
                      {availableCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon || "📁"} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Monthly Limit */}
                <div className="space-y-2">
                  <Label htmlFor="monthly_limit">Monthly Limit ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="monthly_limit"
                      type="number"
                      min="0"
                      step="50"
                      placeholder="500"
                      value={newBudget.monthly_limit}
                      onChange={(e) =>
                        setNewBudget({
                          ...newBudget,
                          monthly_limit: e.target.value,
                        })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Alert Threshold */}
                <div className="space-y-2">
                  <Label htmlFor="alert_threshold">
                    Alert Threshold ({newBudget.alert_threshold}%)
                  </Label>
                  <Input
                    id="alert_threshold"
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={newBudget.alert_threshold}
                    onChange={(e) =>
                      setNewBudget({
                        ...newBudget,
                        alert_threshold: e.target.value,
                      })
                    }
                  />
                  <p className="text-xs text-gray-500">
                    You&apos;ll be alerted when spending reaches this percentage
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSaveBudget}
                    disabled={
                      isLoading ||
                      !newBudget.category_id ||
                      !newBudget.monthly_limit
                    }
                  >
                    {isLoading ? "Saving..." : "Save Budget"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewBudget({
                        category_id: "",
                        monthly_limit: "",
                        alert_threshold: "80",
                      });
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowAddForm(true)}
              className="w-full"
              disabled={
                availableCategories.length === 0 && totalBudget !== undefined
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category Budget
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
