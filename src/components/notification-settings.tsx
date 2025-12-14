"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface NotificationPrefs {
  push_enabled: boolean;
  new_transaction: boolean;
  toggle_change: boolean;
  budget_alert: boolean;
}

interface NotificationSettingsProps {
  initialPrefs: NotificationPrefs | null;
}

export function NotificationSettings({
  initialPrefs,
}: NotificationSettingsProps) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading: pushLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const [prefs, setPrefs] = useState<NotificationPrefs>(
    initialPrefs || {
      push_enabled: true,
      new_transaction: true,
      toggle_change: true,
      budget_alert: true,
    }
  );
  const [isSaving, setIsSaving] = useState(false);

  // Enable/disable push notifications
  const handleEnablePush = async () => {
    if (isSubscribed) {
      await unsubscribe();
      await updatePref("push_enabled", false);
      toast.success("Push notifications disabled");
    } else {
      const success = await subscribe();
      if (success) {
        await updatePref("push_enabled", true);
        toast.success("Push notifications enabled!");
      } else if (permission === "denied") {
        toast.error("Please enable notifications in your browser settings");
      }
    }
  };

  // Update individual preference
  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    setIsSaving(true);
    const previousPrefs = { ...prefs };

    // Optimistic update
    setPrefs((prev) => ({ ...prev, [key]: value }));

    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        throw new Error("Failed to update preference");
      }
    } catch (error) {
      // Revert on error
      console.error("Error updating preference:", error);
      setPrefs(previousPrefs);
      toast.error("Failed to update setting");
    } finally {
      setIsSaving(false);
    }
  };

  // Not supported message
  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this browser.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get notified when your partner adds or modifies expenses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${isSubscribed ? "bg-green-100" : "bg-gray-200"}`}
            >
              {isSubscribed ? (
                <Bell className="h-5 w-5 text-green-600" />
              ) : (
                <BellOff className="h-5 w-5 text-gray-500" />
              )}
            </div>
            <div>
              <Label className="font-medium">
                {isSubscribed ? "Notifications Enabled" : "Enable Notifications"}
              </Label>
              <p className="text-sm text-gray-500">
                {permission === "denied"
                  ? "Blocked in browser settings"
                  : isSubscribed
                    ? "You'll receive push notifications"
                    : "Allow notifications from Duo"}
              </p>
            </div>
          </div>
          <Button
            variant={isSubscribed ? "outline" : "default"}
            onClick={handleEnablePush}
            disabled={pushLoading || permission === "denied"}
          >
            {pushLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSubscribed ? (
              "Disable"
            ) : (
              "Enable"
            )}
          </Button>
        </div>

        {/* Permission Denied Warning */}
        {permission === "denied" && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            Notifications are blocked. To enable them, click the lock icon in
            your browser&apos;s address bar and allow notifications.
          </div>
        )}

        {/* Granular Toggles - Only show if enabled */}
        {isSubscribed && (
          <div className="space-y-4 pt-4 border-t">
            <p className="text-sm font-medium text-gray-700">
              Notify me when:
            </p>

            {/* New Transaction */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="new-transaction">New transaction added</Label>
                <p className="text-xs text-gray-500">
                  When partner adds an expense
                </p>
              </div>
              <Switch
                id="new-transaction"
                checked={prefs.new_transaction}
                onCheckedChange={(checked) =>
                  updatePref("new_transaction", checked)
                }
                disabled={isSaving}
              />
            </div>

            {/* Toggle Change */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="toggle-change">Expense toggled</Label>
                <p className="text-xs text-gray-500">
                  When Personal/Joint status changes
                </p>
              </div>
              <Switch
                id="toggle-change"
                checked={prefs.toggle_change}
                onCheckedChange={(checked) =>
                  updatePref("toggle_change", checked)
                }
                disabled={isSaving}
              />
            </div>

            {/* Budget Alert */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="budget-alert">Budget alerts</Label>
                <p className="text-xs text-gray-500">
                  When spending approaches limits
                </p>
              </div>
              <Switch
                id="budget-alert"
                checked={prefs.budget_alert}
                onCheckedChange={(checked) =>
                  updatePref("budget_alert", checked)
                }
                disabled={isSaving}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
