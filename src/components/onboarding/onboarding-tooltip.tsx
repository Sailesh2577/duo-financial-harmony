"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingTooltipProps {
  title: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  position: {
    top: number;
    left: number;
    placement: "top" | "bottom";
  };
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function OnboardingTooltip({
  title,
  description,
  currentStep,
  totalSteps,
  position,
  onNext,
  onPrev,
  onSkip,
  isFirstStep,
  isLastStep,
}: OnboardingTooltipProps) {
  return (
    <div
      className="fixed z-50 w-80 bg-white rounded-lg shadow-xl border border-slate-200 p-4 animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        top: position.top,
        left: position.left,
        transform: "translateX(-50%)",
      }}
    >
      {/* Arrow */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-slate-200 rotate-45 ${
          position.placement === "bottom"
            ? "-top-1.5 border-l border-t"
            : "-bottom-1.5 border-r border-b"
        }`}
      />

      {/* Skip button */}
      <button
        onClick={onSkip}
        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Skip tour"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Content */}
      <div className="pr-6">
        <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
        <p className="text-sm text-slate-600 mb-4">{description}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Progress */}
        <span className="text-xs text-slate-500">
          Step {currentStep} of {totalSteps}
        </span>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPrev}
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            onClick={onNext}
            className="h-8 bg-violet-600 hover:bg-violet-700"
          >
            {isLastStep ? (
              "Finish"
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
