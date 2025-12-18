"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const CATEGORY_EMOJIS = [
  "🛒", "🍽️", "🚗", "🏠", "💊", "🎮", "👶", "🐕",
  "✈️", "🎁", "💰", "📱", "👕", "💇", "🎬", "📚",
  "⚽", "🍺", "☕", "🔧", "💼", "🎵", "🏋️", "🌿",
  "🎨", "🎭", "🏖️", "🚴", "📦", "💡", "🎓", "🏥",
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          <span className="text-2xl mr-2">{value}</span>
          <span className="text-gray-500">Click to change icon</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="grid grid-cols-8 gap-2">
          {CATEGORY_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onChange(emoji);
                setOpen(false);
              }}
              className={`text-2xl p-2 rounded hover:bg-gray-100 transition-colors ${
                value === emoji ? "bg-violet-100 ring-2 ring-violet-500" : ""
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
