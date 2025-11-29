import { createClient } from "@/lib/supabase/server";
import { Category } from "@/types";

export default async function TestTypesPage() {
  const supabase = await createClient();

  const { data: categories, error } = await supabase
    .from("categories")
    .select("*");

  if (error) {
    return <div className="p-8 text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">✅ Types Working!</h1>
      <p className="text-green-600 mb-4">
        TypeScript knows `categories` is of type `Category[]`
      </p>
      <ul className="space-y-2">
        {categories?.map((cat: Category) => (
          <li key={cat.id} className="flex items-center gap-2">
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
