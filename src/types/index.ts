// src/types/index.ts
import { Database } from "./database.types";

// Table row types (what you get when you SELECT)
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Household = Database["public"]["Tables"]["households"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type Goal = Database["public"]["Tables"]["goals"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];

// Insert types (what you send when you INSERT)
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type HouseholdInsert =
  Database["public"]["Tables"]["households"]["Insert"];
export type TransactionInsert =
  Database["public"]["Tables"]["transactions"]["Insert"];
export type GoalInsert = Database["public"]["Tables"]["goals"]["Insert"];

// Update types (what you send when you UPDATE)
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];
export type HouseholdUpdate =
  Database["public"]["Tables"]["households"]["Update"];
export type TransactionUpdate =
  Database["public"]["Tables"]["transactions"]["Update"];
export type GoalUpdate = Database["public"]["Tables"]["goals"]["Update"];

// Re-export the Database type
export type { Database };
