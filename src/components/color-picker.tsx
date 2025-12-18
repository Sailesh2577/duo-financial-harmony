"use client";

const PRESET_COLORS = [
  "#8B5CF6", // violet-500 (primary)
  "#3B82F6", // blue-500
  "#10B981", // emerald-500
  "#F59E0B", // amber-500
  "#EF4444", // red-500
  "#EC4899", // pink-500
  "#6366F1", // indigo-500
  "#14B8A6", // teal-500
  "#84CC16", // lime-500
  "#F97316", // orange-500
  "#06B6D4", // cyan-500
  "#A855F7", // purple-500
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
            value === color ? "ring-2 ring-offset-2 ring-gray-900" : ""
          }`}
          style={{ backgroundColor: color }}
          aria-label={`Select color ${color}`}
        />
      ))}
    </div>
  );
}
