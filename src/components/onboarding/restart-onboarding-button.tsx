"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function RestartOnboardingButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRestart = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/onboarding/reset", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to reset onboarding");
      }

      toast.success("Restarting app tour...");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Error resetting onboarding:", error);
      toast.error("Failed to restart tour. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleRestart}
      disabled={loading}
      className="w-full sm:w-auto"
    >
      <RotateCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Restarting..." : "Restart App Tour"}
    </Button>
  );
}
