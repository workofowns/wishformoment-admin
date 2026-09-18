import { useState, useEffect, useMemo } from "react";
import { FormStep } from "./FormBuilder";
import {
  parseAndNormalizeSteps,
  serializeStepsToJson,
  validateJson,
  EXAMPLE_JSON_STRING,
} from "@/lib/formFieldParser";
import {
  Check,
  Copy,
  FileCode2,
  RefreshCw,
  Sparkles,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface FormJsonEditorProps {
  steps: FormStep[];
  onApply: (steps: FormStep[]) => void;
  onSwitchToManual?: () => void;
}

export default function FormJsonEditor({
  steps,
  onApply,
  onSwitchToManual,
}: FormJsonEditorProps) {
  // Initialize with the serialized current steps
  const [jsonText, setJsonText] = useState<string>(() => serializeStepsToJson(steps));
  const [copied, setCopied] = useState(false);
  const [showReference, setShowReference] = useState(false);

  // Live validation
  const validation = useMemo(() => validateJson(jsonText), [jsonText]);

  // Keep local json in sync when steps change externally IF the user hasn't typed unapplied changes
  const isDirty = useMemo(() => {
    try {
      const currentSerialized = serializeStepsToJson(steps);
      return jsonText.trim() !== currentSerialized.trim();
    } catch {
      return true;
    }
  }, [steps, jsonText]);

  // Sync from Visual Builder
  const handleSyncFromManual = () => {
    const formatted = serializeStepsToJson(steps);
    setJsonText(formatted);
    toast.success("JSON synchronized from current Visual Builder fields!");
  };

  // Format JSON
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonText(formatted);
      toast.success("JSON formatted cleanly!");
    } catch (e: any) {
      toast.error(`Cannot format: ${e.message}`);
    }
  };

  // Copy JSON to clipboard
  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      toast.success("JSON copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy JSON");
    }
  };

  // Load Example Template JSON
  const handleLoadExample = () => {
    setJsonText(EXAMPLE_JSON_STRING);
    toast.info("Example template loaded! Click 'Apply to Form' to populate visual builder.");
  };

  // Clear Editor
  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear the JSON editor?")) {
      setJsonText("[\n  \n]");
      toast.info("JSON cleared");
    }
  };

  // Apply JSON to Form
  const handleApply = () => {
    if (!validation.isValid || !validation.steps) {
      toast.error(validation.error || "Invalid JSON. Please fix errors before applying.");
      return;
    }

    if (validation.steps.length === 0) {
      toast.error("JSON must contain at least one step with fields.");
      return;
    }

    onApply(validation.steps);
    toast.success(
      `Loaded ${validation.stepCount} steps and ${validation.fieldCount} fields into the Visual Builder!`
    );

    if (onSwitchToManual) {
      onSwitchToManual();
    }
  };

  // Line count for the gutter
  const lineNumbers = useMemo(() => {
    const count = jsonText.split("\n").length;
    return Array.from({ length: Math.max(count, 1) }, (_, i) => i + 1);
  }, [jsonText]);

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
        {/* Left Side: Sync & Quick Actions */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleSyncFromManual}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-primary/50 text-slate-700 hover:text-primary text-xs font-bold transition-all shadow-2xs"
            title="Reset JSON from current Visual Builder fields"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync from Manual</span>
          </button>

          <button
            type="button"
            onClick={handleFormatJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-primary/50 text-slate-700 hover:text-primary text-xs font-bold transition-all shadow-2xs"
            title="Format with 2 spaces indentation"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Format</span>
          </button>

          <button
            type="button"
            onClick={handleCopyJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-primary/50 text-slate-700 hover:text-primary text-xs font-bold transition-all shadow-2xs"
            title="Copy JSON code to clipboard"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>

          <button
            type="button"
            onClick={handleLoadExample}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:border-indigo-300 text-indigo-700 hover:text-indigo-800 text-xs font-bold transition-all shadow-2xs"
            title="Load sample multi-step JSON with images, music, select, and text"
          >
            <FileCode2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Load Example</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
            title="Clear JSON"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Right Side: Primary Apply Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleApply}
            disabled={!validation.isValid || (validation.stepCount ?? 0) === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold tracking-wide transition-all shadow-sm active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Apply to Form & Sync</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-70" />
          </button>
        </div>
      </div>

      {/* Realtime Validation & Status Banner */}
      {validation.isValid ? (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 px-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-900 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">Valid JSON Schema: </span>
              <span>
                {validation.stepCount} Step{(validation.stepCount ?? 0) !== 1 ? "s" : ""} ·{" "}
                {validation.fieldCount} Field Slot{(validation.fieldCount ?? 0) !== 1 ? "s" : ""} ready to populate.
              </span>
            </div>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">
            💡 Default images & songs can be browsed in the Manual Builder once applied.
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 p-3 px-4 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-900 text-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 flex-1">
            <p className="font-bold">JSON Syntax or Schema Error</p>
            <p className="font-mono text-[11px] text-rose-700 break-all">{validation.error}</p>
          </div>
        </div>
      )}

      {/* Warnings (if any) */}
      {validation.warnings && validation.warnings.length > 0 && (
        <div className="flex items-start gap-2.5 p-3 px-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <p className="font-bold">Auto-normalization Notices:</p>
            <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
              {validation.warnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Editor Area with Monospace Gutter & Code */}
      <div className="relative rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shadow-md">
        {/* Editor Title Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 font-bold text-slate-300">form_fields.json</span>
          </div>
          <div className="flex items-center gap-3">
            <span>{lineNumbers.length} lines</span>
            {isDirty && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                Unapplied Edits
              </span>
            )}
          </div>
        </div>

        {/* Code Input Area */}
        <div className="flex min-h-[440px] max-h-[640px] overflow-auto">
          {/* Line Numbers Gutter */}
          <div className="hidden sm:block select-none py-3 px-3 text-right font-mono text-[11px] text-slate-600 bg-slate-950/70 border-r border-slate-800/80 min-w-[44px]">
            {lineNumbers.map((num) => (
              <div key={num} className="leading-6">
                {num}
              </div>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
            placeholder='[\n  {\n    "id": "step_1",\n    "title": "Welcome",\n    "fields": [\n      {\n        "name": "recipientName",\n        "label": "Name",\n        "type": "text"\n      }\n    ]\n  }\n]'
            className="flex-1 p-3 font-mono text-xs text-slate-100 bg-transparent outline-none resize-none leading-6 placeholder:text-slate-600 selection:bg-emerald-500/30"
          />
        </div>
      </div>

      {/* Collapsible Schema & Field Reference */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setShowReference(!showReference)}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-slate-800">
              JSON Format & Schema Reference Guide
            </span>
          </div>
          {showReference ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showReference && (
          <div className="p-4 pt-0 border-t border-slate-100 space-y-4 text-xs text-slate-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
              {/* Step Structure */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Step Object Keys</span>
                </div>
                <ul className="space-y-1 text-[11px]">
                  <li>
                    <code className="font-bold text-slate-800">id</code>: Unique step string (e.g. <code className="text-emerald-700">"step_intro"</code>)
                  </li>
                  <li>
                    <code className="font-bold text-slate-800">title</code>: Step title shown in stepper (e.g. <code className="text-emerald-700">"Welcome Story"</code>)
                  </li>
                  <li>
                    <code className="font-bold text-slate-800">subtitle</code>: (Optional) Short description under title
                  </li>
                  <li>
                    <code className="font-bold text-slate-800">icon</code>: Icon key: <code className="text-slate-700">users, file-text, image, music, heart, sparkles, gift, cake, calendar, star, smile</code>
                  </li>
                  <li>
                    <code className="font-bold text-slate-800">fields</code>: Array of field/slot objects
                  </li>
                </ul>
              </div>

              {/* Field Types */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Supported Field Types</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <div>
                    <code className="font-bold text-slate-800">"text"</code>: Single line input
                  </div>
                  <div>
                    <code className="font-bold text-slate-800">"textarea"</code>: Multi-line note
                  </div>
                  <div>
                    <code className="font-bold text-slate-800">"image"</code>: Photo upload / vault
                  </div>
                  <div>
                    <code className="font-bold text-slate-800">"music"</code>: Song / soundtrack
                  </div>
                  <div>
                    <code className="font-bold text-slate-800">"select"</code>: Dropdown choices
                  </div>
                  <div>
                    <code className="font-bold text-slate-800">"date"</code>: Date picker (YYYY-MM-DD)
                  </div>
                </div>
              </div>
            </div>

            {/* Field Details */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-[11px]">
              <p className="font-bold text-slate-800 text-xs">Field Properties Reference:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <div>
                  <code className="font-bold text-slate-800">name</code>: Unique variable key (<code className="text-emerald-700">a-z, 0-9, _</code>).
                </div>
                <div>
                  <code className="font-bold text-slate-800">label</code>: Display label shown to user.
                </div>
                <div>
                  <code className="font-bold text-slate-800">placeholder</code>: Helper input placeholder.
                </div>
                <div>
                  <code className="font-bold text-slate-800">defaultValue</code>: Default prefilled string.
                </div>
                <div>
                  <code className="font-bold text-slate-800">required</code>: <code className="text-slate-700">true</code> or <code className="text-slate-700">false</code>.
                </div>
                <div>
                  <code className="font-bold text-slate-800">maxLength</code>: Max allowed characters.
                </div>
                <div>
                  <code className="font-bold text-slate-800">multiple</code>: <code className="text-slate-700">true</code> for multi-image / multi-select.
                </div>
                <div>
                  <code className="font-bold text-slate-800">maxSizeMB</code>: Max file size in MB for images.
                </div>
                <div>
                  <code className="font-bold text-slate-800">options</code>: Array of strings for <code className="text-slate-700">select</code> type.
                </div>
                <div>
                  <code className="font-bold text-slate-800">musicCategories</code>: Array of allowed song genres.
                </div>
                <div>
                  <code className="font-bold text-slate-800">description</code>: Instructions displayed below field.
                </div>
                <div>
                  <code className="font-bold text-slate-800">s3Folder</code>: S3 folder path (default: <code className="text-slate-700">"templates"</code>).
                </div>
              </div>
            </div>

            {/* Pro Tip on Image and Song Default Values */}
            <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 text-indigo-900 text-[11px] space-y-1">
              <span className="font-bold">💡 How Default Images & Songs Work:</span>
              <p>
                In JSON, you can set <code className="font-bold text-indigo-950">"defaultValue": ""</code> for images or music.
                After applying JSON to the form, switch to the <strong>Manual Builder</strong> tab to click <strong>"Browse Vault"</strong> (for images) or <strong>"Browse"</strong> (for music) to attach default assets with one click. Any assets chosen in manual mode will automatically be saved and synced back into your JSON!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
