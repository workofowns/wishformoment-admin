import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Paintbrush, Sliders, Check, ChevronDown, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GradientColorPickerProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

const SOLID_PRESETS = [
  "#6C41CF", // Primary brand purple
  "#FF8BC4", // Accent brand pink
  "#A37FF6", // Muted purple
  "#3B82F6", // Blue
  "#06B6D4", // Cyan
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#EC4899", // Fuchsia
  "#84CC16", // Lime
];

const GRADIENT_PRESETS = [
  { name: "Brand Fusion", value: "linear-gradient(135deg, #6c41cf 0%, #ff8bc4 100%)" },
  { name: "Sunset Horizon", value: "linear-gradient(135deg, #f59e0b 0%, #e11d48 100%)" },
  { name: "Ocean Splash", value: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)" },
  { name: "Emerald Mint", value: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)" },
  { name: "Royal Velvet", value: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" },
  { name: "Electric Fuchsia", value: "linear-gradient(135deg, #d946ef 0%, #8b5cf6 100%)" },
  { name: "Warm Peach", value: "linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)" },
  { name: "Mystic Aurora", value: "linear-gradient(135deg, #1e3a8a 0%, #475569 100%)" },
];

function parseGradient(gradientStr: string) {
  const defaults = {
    angle: 135,
    startColor: "#6c41cf",
    endColor: "#ff8bc4",
  };

  if (!gradientStr) return defaults;

  if (!gradientStr.startsWith("linear-gradient")) {
    if (gradientStr.startsWith("#")) {
      return {
        angle: 135,
        startColor: gradientStr,
        endColor: gradientStr,
      };
    }
    return defaults;
  }

  try {
    const angleMatch = gradientStr.match(/(\d+)deg/);
    const colorsMatch = gradientStr.match(/(#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3})/g);

    return {
      angle: angleMatch ? parseInt(angleMatch[1], 10) : defaults.angle,
      startColor: colorsMatch && colorsMatch[0] ? colorsMatch[0] : defaults.startColor,
      endColor:
        colorsMatch && colorsMatch[1]
          ? colorsMatch[1]
          : colorsMatch && colorsMatch[0]
          ? colorsMatch[0]
          : defaults.endColor,
    };
  } catch (e) {
    return defaults;
  }
}

function getGradientPresetName(val: string) {
  if (!val) return "";
  const normalized = val.toLowerCase().replace(/\s+/g, "");
  const found = GRADIENT_PRESETS.find((p) => p.value.toLowerCase().replace(/\s+/g, "") === normalized);
  return found?.name || "";
}

export function GradientColorPicker({ value, onChange, className }: GradientColorPickerProps) {
  const safeValue = value || "#6C41CF";
  const isGradient = safeValue.startsWith("linear-gradient");
  const [activeTab, setActiveTab] = useState<"solid" | "gradient">(isGradient ? "gradient" : "solid");

  // Local state for custom gradient editor
  const parsed = parseGradient(safeValue);
  const [startColor, setStartColor] = useState(parsed.startColor);
  const [endColor, setEndColor] = useState(parsed.endColor);
  const [angle, setAngle] = useState(parsed.angle);

  // Sync state if external value changes
  useEffect(() => {
    const updated = parseGradient(safeValue);
    setStartColor(updated.startColor);
    setEndColor(updated.endColor);
    setAngle(updated.angle);
    setActiveTab(safeValue.startsWith("linear-gradient") ? "gradient" : "solid");
  }, [safeValue]);

  const handleCustomGradientChange = (newStart: string, newEnd: string, newAngle: number) => {
    setStartColor(newStart);
    setEndColor(newEnd);
    setAngle(newAngle);
    onChange(`linear-gradient(${newAngle}deg, ${newStart} 0%, ${newEnd} 100%)`);
  };

  const presetName = isGradient ? getGradientPresetName(safeValue) : "";
  const displayLabel = isGradient
    ? presetName || `Gradient (${angle}°)`
    : safeValue;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative flex items-center justify-between w-full h-10 px-3 rounded-xl border border-border bg-card hover:border-primary/50 transition-all cursor-pointer shadow-xs group text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
            className
          )}
          aria-label="Choose theme color or brand gradient"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Swatch chip */}
            <div
              className="relative w-6 h-6 rounded-lg border border-black/10 dark:border-white/10 shadow-xs shrink-0 overflow-hidden"
              style={{ background: safeValue }}
            >
              <div className="absolute inset-0 bg-white/5 backdrop-blur-[0.5px]" />
            </div>

            {/* Label and Badge */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono text-xs font-bold text-foreground truncate">
                {displayLabel}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground shrink-0">
                {isGradient ? "Gradient" : "Solid"}
              </span>
            </div>
          </div>

          {/* Action icon */}
          <div className="flex items-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 pl-2">
            <span className="text-[11px] font-semibold hidden sm:inline">Pick</span>
            <Paintbrush className="w-3.5 h-3.5" />
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 sm:w-84 p-4 bg-popover rounded-2xl shadow-xl border border-border flex flex-col gap-4 z-50">
        <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-md border border-border shadow-xs shrink-0"
              style={{ background: safeValue }}
            />
            <span className="font-bold text-xs uppercase tracking-wider text-foreground">Color Settings</span>
          </div>

          <div className="flex bg-muted/70 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setActiveTab("solid");
                onChange(startColor || SOLID_PRESETS[0]);
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === "solid"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Paintbrush className="w-3 h-3" /> Solid
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("gradient");
                onChange(`linear-gradient(${angle}deg, ${startColor} 0%, ${endColor} 100%)`);
              }}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === "gradient"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sliders className="w-3 h-3" /> Gradient
            </button>
          </div>
        </div>

        {activeTab === "solid" ? (
          <div className="flex flex-col gap-3">
            {/* Custom Color Wheel & HEX Input */}
            <div className="flex items-center gap-2.5">
              <div
                className="relative w-10 h-10 rounded-xl border border-border overflow-hidden cursor-pointer shadow-xs shrink-0 hover:scale-105 transition-transform"
                style={{ backgroundColor: safeValue.startsWith("linear-gradient") ? startColor : safeValue }}
                title="Click to open color picker"
              >
                <input
                  type="color"
                  value={safeValue.startsWith("linear-gradient") ? startColor : safeValue}
                  onChange={(e) => onChange(e.target.value)}
                  className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer opacity-0"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={safeValue.startsWith("linear-gradient") ? startColor : safeValue}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (!val.startsWith("#") && val.length > 0) val = "#" + val;
                    if (val.length <= 9) {
                      onChange(val);
                    }
                  }}
                  placeholder="#HEX Color"
                  className="w-full px-3 py-2 bg-muted/50 rounded-xl text-xs font-mono font-bold border border-border/80 focus:border-primary/50 focus:bg-background outline-none text-foreground uppercase tracking-wide"
                />
              </div>
            </div>

            {/* Presets Grid */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                Brand Solid Presets
              </span>
              <div className="grid grid-cols-5 gap-2">
                {SOLID_PRESETS.map((color) => {
                  const isSelected = safeValue.toLowerCase() === color.toLowerCase();
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => onChange(color)}
                      className={cn(
                        "h-8 rounded-lg border transition-all relative flex items-center justify-center cursor-pointer shadow-2xs hover:scale-108",
                        isSelected
                          ? "border-primary ring-2 ring-primary/20 scale-105"
                          : "border-border/40 hover:shadow-sm"
                      )}
                      style={{ backgroundColor: color }}
                      title={color}
                    >
                      {isSelected && (
                        <Check className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Custom Gradient Builder Controls */}
            <div className="flex items-center justify-between gap-2 bg-muted/40 p-2.5 rounded-xl border border-border/40">
              <div className="flex items-center gap-1.5">
                <div className="flex flex-col gap-1 items-center">
                  <span className="text-[10px] font-bold text-muted-foreground">Start</span>
                  <div
                    className="relative w-8 h-8 rounded-lg border border-border overflow-hidden shadow-xs cursor-pointer"
                    style={{ backgroundColor: startColor }}
                    title="Change Start Color"
                  >
                    <input
                      type="color"
                      value={startColor}
                      onChange={(e) => handleCustomGradientChange(e.target.value, endColor, angle)}
                      className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer opacity-0"
                    />
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground font-semibold uppercase">{startColor}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCustomGradientChange(endColor, startColor, angle)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors self-center mt-1 cursor-pointer"
                  title="Swap start and end colors"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex flex-col gap-1 items-center">
                  <span className="text-[10px] font-bold text-muted-foreground">End</span>
                  <div
                    className="relative w-8 h-8 rounded-lg border border-border overflow-hidden shadow-xs cursor-pointer"
                    style={{ backgroundColor: endColor }}
                    title="Change End Color"
                  >
                    <input
                      type="color"
                      value={endColor}
                      onChange={(e) => handleCustomGradientChange(startColor, e.target.value, angle)}
                      className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer opacity-0"
                    />
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground font-semibold uppercase">{endColor}</span>
                </div>
              </div>

              {/* Angle slider & Quick angle buttons */}
              <div className="flex-1 flex flex-col gap-1 pl-2 border-l border-border/40">
                <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                  <span>Angle</span>
                  <span className="font-mono text-foreground font-bold">{angle}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={angle}
                  onChange={(e) => handleCustomGradientChange(startColor, endColor, parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground pt-0.5">
                  {[90, 135, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => handleCustomGradientChange(startColor, endColor, deg)}
                      className={cn(
                        "px-1 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer",
                        angle === deg
                          ? "bg-primary text-white"
                          : "bg-muted/70 hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Gradient Live Preview Box */}
            <div
              className="w-full h-9 rounded-xl border border-border/80 shadow-inner flex items-center justify-center relative overflow-hidden"
              style={{ background: `linear-gradient(${angle}deg, ${startColor} 0%, ${endColor} 100%)` }}
            >
              <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                Live Gradient Preview
              </span>
            </div>

            {/* Presets Grid */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                Brand Gradient Presets
              </span>
              <div className="grid grid-cols-2 gap-2">
                {GRADIENT_PRESETS.map((preset) => {
                  const isSelected = safeValue.toLowerCase().replace(/\s+/g, "") === preset.value.toLowerCase().replace(/\s+/g, "");
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => onChange(preset.value)}
                      title={preset.name}
                      className={cn(
                        "h-8 px-2.5 rounded-xl border transition-all relative flex items-center justify-between overflow-hidden shadow-2xs hover:scale-102 cursor-pointer text-left",
                        isSelected
                          ? "border-primary ring-2 ring-primary/20 scale-102"
                          : "border-border/40 hover:border-primary/30"
                      )}
                      style={{ background: preset.value }}
                    >
                      <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] truncate max-w-[95px]">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <div className="w-3.5 h-3.5 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 text-white drop-shadow-sm" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
