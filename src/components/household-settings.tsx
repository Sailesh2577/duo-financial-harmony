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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Home, Scale } from "lucide-react";

interface HouseholdSettingsProps {
  householdName: string;
  showSettlement: boolean;
}

export function HouseholdSettings({
  householdName,
  showSettlement: initialShowSettlement,
}: HouseholdSettingsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showSettlement, setShowSettlement] = useState(initialShowSettlement);

  const handleToggleSettlement = async (checked: boolean) => {
    setIsLoading(true);
    const previousValue = showSettlement;
    setShowSettlement(checked); // Optimistic update

    try {
      const response = await fetch("/api/settings/household", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_settlement: checked }),
      });

      if (!response.ok) {
        throw new Error("Failed to update setting");
      }

      toast.success(
        checked ? "Settlement feature enabled" : "Settlement feature hidden"
      );
      router.refresh();
    } catch (error) {
      console.error("Error updating household settings:", error);
      setShowSettlement(previousValue); // Revert on error
      toast.error("Failed to update setting. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          Household Settings
        </CardTitle>
        <CardDescription>
          Configure settings for {householdName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Settlement Feature Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Scale className="h-5 w-5 text-indigo-600" />
            <div>
              <Label htmlFor="show-settlement" className="font-medium">
                Monthly Settlement
              </Label>
              <p className="text-sm text-gray-500">
                Track and settle shared expenses between partners
              </p>
            </div>
          </div>
          <Switch
            id="show-settlement"
            checked={showSettlement}
            onCheckedChange={handleToggleSettlement}
            disabled={isLoading}
          />
        </div>

        {!showSettlement && (
          <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
            Settlement is hidden. Joint transactions will still be tracked, but
            the settlement page and dashboard widget won&apos;t be visible.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
