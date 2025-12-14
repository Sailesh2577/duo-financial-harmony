import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

interface NotificationPrefs {
  push_enabled: boolean;
  new_transaction: boolean;
  toggle_change: boolean;
  budget_alert: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  push_enabled: true,
  new_transaction: true,
  toggle_change: true,
  budget_alert: true,
};

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data } = await supabase
      .from("users")
      .select("notification_prefs")
      .eq("id", user.id)
      .single();

    const prefs = (data?.notification_prefs as unknown as NotificationPrefs) || DEFAULT_PREFS;

    return NextResponse.json({ preferences: prefs });
  } catch (error) {
    console.error("Get preferences error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { push_enabled, new_transaction, toggle_change, budget_alert } = body;

    // Get current prefs
    const { data: userData } = await supabase
      .from("users")
      .select("notification_prefs")
      .eq("id", user.id)
      .single();

    const currentPrefs = (userData?.notification_prefs as unknown as NotificationPrefs) || DEFAULT_PREFS;

    // Merge with updates
    const updatedPrefs: NotificationPrefs = {
      push_enabled: push_enabled ?? currentPrefs.push_enabled,
      new_transaction: new_transaction ?? currentPrefs.new_transaction,
      toggle_change: toggle_change ?? currentPrefs.toggle_change,
      budget_alert: budget_alert ?? currentPrefs.budget_alert,
    };

    const { error: updateError } = await supabase
      .from("users")
      .update({ notification_prefs: updatedPrefs as unknown as Json })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating preferences:", updateError);
      return NextResponse.json(
        { error: "Failed to update preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, preferences: updatedPrefs });
  } catch (error) {
    console.error("Update preferences error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
