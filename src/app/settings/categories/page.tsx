import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryList } from "@/components/category-list";
import { Tag } from "lucide-react";

export default async function CategoriesPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Get user profile with household_id
  const { data: userProfile } = await supabase
    .from("users")
    .select("household_id")
    .eq("id", user.id)
    .single();

  if (!userProfile?.household_id) {
    redirect("/onboarding");
  }

  // Fetch all categories (system + household custom)
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .or(`household_id.is.null,household_id.eq.${userProfile.household_id}`)
    .order("is_default", { ascending: false })
    .order("name");

  // Get transaction counts per category for this household
  const { data: transactions } = await supabase
    .from("transactions")
    .select("category_id")
    .eq("household_id", userProfile.household_id);

  // Count transactions per category
  const transactionCounts: Record<string, number> = {};
  transactions?.forEach((txn) => {
    if (txn.category_id) {
      transactionCounts[txn.category_id] =
        (transactionCounts[txn.category_id] || 0) + 1;
    }
  });

  // Add transaction count to each category
  const categoriesWithCount =
    categories?.map((cat) => ({
      ...cat,
      transaction_count: transactionCounts[cat.id] || 0,
    })) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Categories
          </CardTitle>
          <CardDescription>
            Manage your spending categories. System categories are shared across
            all households. Custom categories are specific to your household and
            will appear in all category dropdowns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryList
            categories={categoriesWithCount}
            householdId={userProfile.household_id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
