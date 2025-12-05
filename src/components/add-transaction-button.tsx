"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBrowserClient } from "@supabase/ssr";

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

export function AddTransactionButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form state
  const [amount, setAmount] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  // 1. Added State for Joint/Personal toggle
  const [isJoint, setIsJoint] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase
        .from("categories")
        .select("id, name, icon")
        .order("name");

      if (!error && data) {
        setCategories(data);
      }
    }

    fetchCategories();
  }, []);

  // Reset form when dialog closes
  const resetForm = () => {
    setAmount("");
    setMerchantName("");
    setCategoryId("");
    setDate(new Date().toISOString().split("T")[0]);
    setIsJoint(false); // Reset toggle
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!merchantName.trim()) {
      toast.error("Please enter a merchant name");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/transactions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // 2. Updated API call to include isJoint
        body: JSON.stringify({
          amount: parseFloat(amount),
          merchantName: merchantName.trim(),
          categoryId: categoryId || null,
          date,
          description: merchantName.trim(),
          isJoint,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create transaction");
      }

      toast.success("Transaction added successfully!");
      setOpen(false);
      resetForm();

      // Refresh the page to show the new transaction
      router.refresh();
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add transaction"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50"
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">Add transaction</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Manually add a cash expense or any transaction not tracked by your
              bank.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Amount Field */}
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Merchant Name Field */}
            <div className="grid gap-2">
              <Label htmlFor="merchantName">Merchant *</Label>
              <Input
                id="merchantName"
                placeholder="e.g., Coffee Shop, Gas Station"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                required
              />
            </div>

            {/* Category Dropdown */}
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Field */}
            <div className="grid gap-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* 3. Added Joint/Personal Toggle UI */}
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsJoint(false)}
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                    !isJoint
                      ? "bg-slate-100 border-slate-300 text-slate-900"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  👤 Personal
                </button>
                <button
                  type="button"
                  onClick={() => setIsJoint(true)}
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                    isJoint
                      ? "bg-purple-100 border-purple-300 text-purple-900"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  👥 Joint
                </button>
              </div>
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
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
