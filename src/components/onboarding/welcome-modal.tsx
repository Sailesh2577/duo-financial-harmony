"use client";

import { User, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WelcomeModalProps {
  open: boolean;
  onSkip: () => void;
  onStartTour: () => void;
}

export function WelcomeModal({ open, onSkip, onStartTour }: WelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onSkip()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-2xl">Welcome to Duo!</DialogTitle>
          <DialogDescription className="text-base">
            The app that makes managing money with your partner simple and
            stress-free.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 py-6">
          {/* Track Personal */}
          <div className="flex flex-col items-center text-center p-4 rounded-lg bg-slate-50">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-medium text-sm text-slate-900">Track</h3>
            <p className="text-xs text-slate-500 mt-1">Personal Expenses</p>
          </div>

          {/* Share Joint */}
          <div className="flex flex-col items-center text-center p-4 rounded-lg bg-slate-50">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-medium text-sm text-slate-900">Share</h3>
            <p className="text-xs text-slate-500 mt-1">Joint Expenses</p>
          </div>

          {/* Settle Monthly */}
          <div className="flex flex-col items-center text-center p-4 rounded-lg bg-slate-50">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <BarChart3 className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="font-medium text-sm text-slate-900">Settle</h3>
            <p className="text-xs text-slate-500 mt-1">Monthly Fairly</p>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-center">
          <Button variant="outline" onClick={onSkip} className="flex-1 sm:flex-none">
            Skip
          </Button>
          <Button
            onClick={onStartTour}
            className="flex-1 sm:flex-none bg-violet-600 hover:bg-violet-700"
          >
            Start Tour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
