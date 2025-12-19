"use client";

import { createContext, useContext } from "react";

export interface OnboardingStep {
  id: string;
  target: string; // data-onboarding attribute value
  title: string;
  description: string;
}

export interface OnboardingContextType {
  currentStep: number;
  isActive: boolean;
  totalSteps: number;
  steps: OnboardingStep[];
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
}

export const OnboardingContext = createContext<OnboardingContextType | null>(
  null
);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
