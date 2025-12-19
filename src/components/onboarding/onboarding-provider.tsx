"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  OnboardingContext,
  OnboardingStep,
} from "@/hooks/use-onboarding";
import { WelcomeModal } from "./welcome-modal";
import { Spotlight } from "./spotlight";

// All possible onboarding steps
const ALL_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    target: "", // No target for modal
    title: "Welcome",
    description: "Welcome to Duo!",
  },
  {
    id: "summary-cards",
    target: "summary-cards",
    title: "Your Spending Summary",
    description:
      "See your spending at a glance - your personal expenses, your partner's, and joint expenses.",
  },
  {
    id: "invite-partner",
    target: "invite-partner",
    title: "Invite Your Partner",
    description:
      "Share this code with your partner so you can track expenses together!",
  },
  {
    id: "transactions",
    target: "transactions",
    title: "Your Transactions",
    description:
      "All your transactions appear here. Link your bank to sync automatically, or add them manually.",
  },
  {
    id: "add-button",
    target: "add-button",
    title: "Add Transactions",
    description:
      "Tap here to add cash expenses or transactions that don't come from your bank.",
  },
  {
    id: "settings",
    target: "settings",
    title: "Customize Your Experience",
    description:
      "Set spending budgets, manage categories, and customize notifications.",
  },
];

interface OnboardingProviderProps {
  showOnboarding: boolean;
  hasPartner: boolean;
  children: React.ReactNode;
}

export function OnboardingProvider({
  showOnboarding,
  hasPartner,
  children,
}: OnboardingProviderProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(showOnboarding);
  // Track if user has completed/skipped to prevent re-activation on refresh
  const hasCompletedRef = useRef(false);

  // Filter steps based on whether user has a partner
  const steps = useMemo(() => {
    if (hasPartner) {
      // Skip the invite-partner step if they already have a partner
      return ALL_STEPS.filter((step) => step.id !== "invite-partner");
    }
    return ALL_STEPS;
  }, [hasPartner]);

  // Total steps excluding welcome modal (step 0)
  const totalSteps = steps.length - 1;

  // Mark onboarding as complete via API
  const markComplete = useCallback(async () => {
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to save onboarding status");
      }
    } catch (error) {
      console.error("Error marking onboarding complete:", error);
      // Don't show error to user - just log it
    }
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Last step - complete onboarding
      hasCompletedRef.current = true;
      setIsActive(false);
      markComplete();
      toast.success("Tour complete! You're all set.");
      router.refresh();
    }
  }, [currentStep, steps.length, markComplete, router]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      // Can't go back to welcome modal
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const skipOnboarding = useCallback(() => {
    hasCompletedRef.current = true;
    setIsActive(false);
    markComplete();
    router.refresh();
  }, [markComplete, router]);

  const completeOnboarding = useCallback(() => {
    hasCompletedRef.current = true;
    setIsActive(false);
    markComplete();
    toast.success("Tour complete! You're all set.");
    router.refresh();
  }, [markComplete, router]);

  // Reset state if showOnboarding changes (e.g., after reset from settings)
  // Only re-activate if user hasn't completed/skipped in this session
  useEffect(() => {
    if (showOnboarding && !isActive && !hasCompletedRef.current) {
      setIsActive(true);
      setCurrentStep(0);
    }
  }, [showOnboarding, isActive]);

  const contextValue = useMemo(
    () => ({
      currentStep,
      isActive,
      totalSteps,
      steps,
      nextStep,
      prevStep,
      skipOnboarding,
      completeOnboarding,
    }),
    [
      currentStep,
      isActive,
      totalSteps,
      steps,
      nextStep,
      prevStep,
      skipOnboarding,
      completeOnboarding,
    ]
  );

  // Get current step data (adjusted for filtered steps)
  const currentStepData = steps[currentStep];
  const isWelcomeStep = currentStep === 0;
  const displayStep = currentStep; // Step number for display (1-indexed in tooltip)
  const isFirstSpotlightStep = currentStep === 1;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}

      {/* Welcome Modal (Step 0) */}
      {isActive && isWelcomeStep && (
        <WelcomeModal
          open={true}
          onSkip={skipOnboarding}
          onStartTour={nextStep}
        />
      )}

      {/* Spotlight (Steps 1+) */}
      {isActive && !isWelcomeStep && currentStepData && (
        <Spotlight
          step={currentStepData}
          currentStep={displayStep}
          totalSteps={totalSteps}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipOnboarding}
          isFirstStep={isFirstSpotlightStep}
          isLastStep={isLastStep}
        />
      )}
    </OnboardingContext.Provider>
  );
}
