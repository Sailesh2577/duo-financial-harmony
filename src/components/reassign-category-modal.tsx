"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  transaction_count: number;
}

interface ReassignCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  categories: Category[];
  onConfirm: (reassignTo: string | undefined) => void;
  isLoading: boolean;
}

export function ReassignCategoryModal({
  open,
  onOpenChange,
  category,
  categories,
  onConfirm,
  isLoading,
}: ReassignCategoryModalProps) {
  const [reassignTo, setReassignTo] = useState<string>("");

  if (!category) return null;

  const handleConfirm = () => {
    onConfirm(reassignTo || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Category Has Transactions
          </DialogTitle>
          <DialogDescription>
            &quot;{category.name}&quot; has {category.transaction_count}{" "}
            transaction
            {category.transaction_count !== 1 ? "s" : ""}. What would you like
            to do?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            You can reassign these transactions to another category, or leave
            them uncategorized.
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reassign">Reassign transactions to:</Label>
            <Select value={reassignTo} onValueChange={setReassignTo}>
              <SelectTrigger>
                <SelectValue placeholder="Leave uncategorized" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uncategorized">Leave uncategorized</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon || "📁"} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? "Deleting..." : "Delete Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
