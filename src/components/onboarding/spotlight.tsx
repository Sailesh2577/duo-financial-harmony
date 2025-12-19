"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { OnboardingTooltip } from "./onboarding-tooltip";
import { OnboardingStep } from "@/hooks/use-onboarding";

interface SpotlightProps {
  step: OnboardingStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function Spotlight({
  step,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isFirstStep,
  isLastStep,
}: SpotlightProps) {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    top: number;
    left: number;
    placement: "top" | "bottom";
  } | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Track if we initiated a scroll to prevent re-triggering
  const isScrollingRef = useRef(false);
  const hasScrolledRef = useRef(false);

  const updatePositions = useCallback(() => {
    const element = document.querySelector(
      `[data-onboarding="${step.target}"]`
    );

    if (!element) {
      console.warn(`Onboarding target not found: ${step.target}`);
      return;
    }

    // Get bounding rect - this gives us viewport-relative coordinates
    const rect = element.getBoundingClientRect();
    const padding = 8;

    // For fixed positioning, we use viewport coordinates directly
    const newTargetRect = {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    };
    setTargetRect(newTargetRect);

    // Calculate tooltip position (viewport relative)
    const viewportHeight = window.innerHeight;
    const tooltipHeight = 180; // Approximate tooltip height
    const tooltipWidth = 320;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    let placement: "top" | "bottom" = "bottom";
    let tooltipTop: number;

    if (spaceBelow >= tooltipHeight + 20) {
      placement = "bottom";
      tooltipTop = rect.bottom + 16;
    } else if (spaceAbove >= tooltipHeight + 20) {
      placement = "top";
      tooltipTop = rect.top - tooltipHeight - 16;
    } else {
      // Not enough space, prefer bottom but adjust
      placement = "bottom";
      tooltipTop = Math.min(rect.bottom + 16, viewportHeight - tooltipHeight - 16);
    }

    // Center tooltip horizontally relative to target, keep in viewport
    let tooltipLeft = rect.left + rect.width / 2;
    const minLeft = tooltipWidth / 2 + 16;
    const maxLeft = window.innerWidth - tooltipWidth / 2 - 16;
    tooltipLeft = Math.max(minLeft, Math.min(maxLeft, tooltipLeft));

    setTooltipPosition({
      top: tooltipTop,
      left: tooltipLeft,
      placement,
    });
  }, [step.target]);

  const scrollToElementIfNeeded = useCallback(() => {
    if (hasScrolledRef.current || isScrollingRef.current) return;

    const element = document.querySelector(
      `[data-onboarding="${step.target}"]`
    );

    if (!element) return;

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Check if element is outside comfortable viewing area
    const needsScroll = rect.top < 80 || rect.bottom > viewportHeight - 80;

    if (needsScroll) {
      isScrollingRef.current = true;
      hasScrolledRef.current = true;

      element.scrollIntoView({ behavior: "smooth", block: "center" });

      // Wait for scroll to complete
      setTimeout(() => {
        isScrollingRef.current = false;
        updatePositions();
        setIsReady(true);
      }, 400);
    } else {
      setIsReady(true);
    }
  }, [step.target, updatePositions]);

  // Initial setup when step changes
  useEffect(() => {
    setIsReady(false);
    hasScrolledRef.current = false;
    isScrollingRef.current = false;

    // Small delay to let DOM settle
    const timer = setTimeout(() => {
      updatePositions();
      scrollToElementIfNeeded();
    }, 50);

    return () => clearTimeout(timer);
  }, [step.target, updatePositions, scrollToElementIfNeeded]);

  // Update positions on scroll (but don't trigger new scrolls)
  useEffect(() => {
    const handleScroll = () => {
      if (!isScrollingRef.current) {
        updatePositions();
      }
    };

    const handleResize = () => {
      updatePositions();
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [updatePositions]);

  // Don't render until ready
  if (!targetRect || !tooltipPosition || !isReady) {
    // Show just the dark overlay while calculating
    return (
      <div className="fixed inset-0 bg-black/60 z-40" />
    );
  }

  return (
    <>
      {/* Dark overlay with spotlight cutout using clip-path */}
      <div
        className="fixed inset-0 z-40 pointer-events-none"
        style={{
          background: "rgba(0, 0, 0, 0.6)",
          clipPath: `polygon(
            0% 0%,
            0% 100%,
            ${targetRect.left}px 100%,
            ${targetRect.left}px ${targetRect.top}px,
            ${targetRect.left + targetRect.width}px ${targetRect.top}px,
            ${targetRect.left + targetRect.width}px ${targetRect.top + targetRect.height}px,
            ${targetRect.left}px ${targetRect.top + targetRect.height}px,
            ${targetRect.left}px 100%,
            100% 100%,
            100% 0%
          )`,
        }}
      />

      {/* Spotlight border highlight */}
      <div
        className="fixed z-40 pointer-events-none rounded-lg ring-2 ring-violet-500 ring-offset-2"
        style={{
          top: targetRect.top,
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height,
        }}
      />

      {/* Tooltip */}
      <OnboardingTooltip
        title={step.title}
        description={step.description}
        currentStep={currentStep}
        totalSteps={totalSteps}
        position={tooltipPosition}
        onNext={onNext}
        onPrev={onPrev}
        onSkip={onSkip}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
      />
    </>
  );
}
