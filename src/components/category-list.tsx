"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CategoryFormModal } from "@/components/category-form";
import { ReassignCategoryModal } from "@/components/reassign-category-modal";

interface CategoryWithCount {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  is_default: boolean | null;
  household_id: string | null;
  transaction_count: number;
}

interface CategoryListProps {
  categories: CategoryWithCount[];
  householdId: string;
}

export function CategoryList({ categories }: CategoryListProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<CategoryWithCount | null>(null);
  const [deletingCategory, setDeletingCategory] =
    useState<CategoryWithCount | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);

  // Separate system and custom categories
  const systemCategories = categories.filter((c) => c.is_default);
  const customCategories = categories.filter((c) => !c.is_default);

  const handleDelete = async (categoryId: string, reassignTo?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reassign_to: reassignTo === "uncategorized" ? undefined : reassignTo,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete category");
      }

      toast.success("Category deleted successfully");
      setDeletingCategory(null);
      setShowReassignModal(false);
      router.refresh();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete category"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (category: CategoryWithCount) => {
    setDeletingCategory(category);
    if (category.transaction_count > 0) {
      setShowReassignModal(true);
    }
  };

  const handleConfirmSimpleDelete = () => {
    if (deletingCategory) {
      handleDelete(deletingCategory.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* System Categories Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Lock className="h-4 w-4" />
          <span>System Categories (read-only)</span>
        </div>
        <div className="grid gap-2">
          {systemCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              isSystem={true}
            />
          ))}
        </div>
      </div>

      {/* Custom Categories Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Custom Categories</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>

        {customCategories.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
            <p>No custom categories yet.</p>
            <p className="text-sm">Create one to get started!</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {customCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                isSystem={false}
                onEdit={() => setEditingCategory(category)}
                onDelete={() => handleDeleteClick(category)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <CategoryFormModal
        open={showCreateModal || !!editingCategory}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false);
            setEditingCategory(null);
          }
        }}
        category={editingCategory}
        onSuccess={() => {
          setShowCreateModal(false);
          setEditingCategory(null);
          router.refresh();
        }}
      />

      {/* Simple Delete Confirmation (no transactions) */}
      <AlertDialog
        open={
          !!deletingCategory &&
          !showReassignModal &&
          deletingCategory.transaction_count === 0
        }
        onOpenChange={(open) => !open && setDeletingCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingCategory?.name}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSimpleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reassign Modal (category has transactions) */}
      <ReassignCategoryModal
        open={showReassignModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowReassignModal(false);
            setDeletingCategory(null);
          }
        }}
        category={deletingCategory}
        categories={categories.filter((c) => c.id !== deletingCategory?.id)}
        onConfirm={(reassignTo) => {
          if (deletingCategory) {
            handleDelete(deletingCategory.id, reassignTo);
          }
        }}
        isLoading={isLoading}
      />
    </div>
  );
}

// CategoryCard sub-component
function CategoryCard({
  category,
  isSystem,
  onEdit,
  onDelete,
}: {
  category: CategoryWithCount;
  isSystem: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between p-3 bg-white rounded-lg border"
      style={{
        borderLeftColor: category.color || "#e2e8f0",
        borderLeftWidth: "4px",
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{category.icon || "📁"}</span>
        <div>
          <span className="font-medium">{category.name}</span>
          <span className="ml-2 text-sm text-gray-500">
            ({category.transaction_count} transaction
            {category.transaction_count !== 1 ? "s" : ""})
          </span>
        </div>
        {isSystem && (
          <Badge variant="secondary" className="text-xs">
            System
          </Badge>
        )}
      </div>

      {!isSystem && (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )}
    </div>
  );
}
