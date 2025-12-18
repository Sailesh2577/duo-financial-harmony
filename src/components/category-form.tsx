"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmojiPicker } from "@/components/emoji-picker";
import { ColorPicker } from "@/components/color-picker";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface CategoryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSuccess: () => void;
}

export function CategoryFormModal({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryFormModalProps) {
  const isEditMode = !!category;
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>("📁");
  const [color, setColor] = useState<string>("#8B5CF6");

  // Reset form when modal opens/closes or category changes
  useEffect(() => {
    if (open && category) {
      setName(category.name);
      setIcon(category.icon || "📁");
      setColor(category.color || "#8B5CF6");
    } else if (!open) {
      setName("");
      setIcon("📁");
      setColor("#8B5CF6");
    }
  }, [open, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    setLoading(true);

    try {
      const url = isEditMode
        ? `/api/categories/${category.id}`
        : "/api/categories";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), icon, color }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Failed to ${isEditMode ? "update" : "create"} category`
        );
      }

      toast.success(
        `Category ${isEditMode ? "updated" : "created"} successfully!`
      );
      onSuccess();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save category"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Category" : "Create Category"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update your custom category details."
                : "Create a new custom category for your household."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name Field */}
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Pet Supplies"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Icon Picker */}
            <div className="grid gap-2">
              <Label>Icon</Label>
              <EmojiPicker value={icon} onChange={setIcon} />
            </div>

            {/* Color Picker */}
            <div className="grid gap-2">
              <Label>Color</Label>
              <ColorPicker value={color} onChange={setColor} />
            </div>

            {/* Preview */}
            <div className="grid gap-2">
              <Label>Preview</Label>
              <div
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border"
                style={{ borderLeftColor: color, borderLeftWidth: "4px" }}
              >
                <span className="text-xl">{icon}</span>
                <span className="font-medium">{name || "Category Name"}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEditMode ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
