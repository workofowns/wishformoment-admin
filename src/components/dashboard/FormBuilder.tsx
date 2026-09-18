import { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
  MoveUp,
  MoveDown,
  Sliders,
  FileCode2,
} from "lucide-react";
import FieldBuilder, { FormField } from "./FieldBuilder";
import FormJsonEditor from "./FormJsonEditor";

export interface FormStep {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  fields: FormField[];
}

interface FormBuilderProps {
  steps: FormStep[];
  onChange: (steps: FormStep[]) => void;
}

const STEP_ICONS = [
  { value: "users", label: "👥 Users (About / Couple)" },
  { value: "file-text", label: "📄 Letter / Message" },
  { value: "image", label: "🖼️ Photos / Gallery" },
  { value: "camera", label: "📸 Camera / Snapshots" },
  { value: "music", label: "🎵 Music / Soundtrack" },
  { value: "heart", label: "💜 Heart / Reasons" },
  { value: "sparkles", label: "✨ Sparkles / Magic" },
  { value: "gift", label: "🎁 Gift / Surprise" },
  { value: "cake", label: "🎂 Cake / Birthday" },
  { value: "calendar", label: "📅 Calendar / Date" },
  { value: "star", label: "⭐ Star / Rating" },
  { value: "smile", label: "😊 Smile / Memories" },
  { value: "gamepad", label: "🎮 Game / Interactive" },
];

const FormBuilder = ({ steps, onChange }: FormBuilderProps) => {
  const [activeTab, setActiveTab] = useState<"manual" | "json">("manual");

  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>(() => {
    // Expand all steps by default
    return steps.reduce((acc, step) => ({ ...acc, [step.id]: true }), {});
  });

  const totalFields = steps.reduce((acc, step) => acc + (step.fields?.length || 0), 0);

  const toggleStepExpand = (stepId: string) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const addStep = () => {
    const newId = `step_${Date.now()}`;
    onChange([
      ...steps,
      {
        id: newId,
        title: `Step ${steps.length + 1}`,
        subtitle: "",
        icon: "users",
        fields: [],
      },
    ]);
    setExpandedSteps((prev) => ({ ...prev, [newId]: true }));
  };

  const updateStepTitle = (index: number, title: string) => {
    const newSteps = [...steps];
    newSteps[index].title = title;
    onChange(newSteps);
  };

  const updateStepSubtitle = (index: number, subtitle: string) => {
    const newSteps = [...steps];
    newSteps[index].subtitle = subtitle;
    onChange(newSteps);
  };

  const updateStepDescription = (index: number, description: string) => {
    const newSteps = [...steps];
    newSteps[index].description = description;
    onChange(newSteps);
  };

  const updateStepIcon = (index: number, icon: string) => {
    const newSteps = [...steps];
    newSteps[index].icon = icon;
    onChange(newSteps);
  };

  const updateStepFields = (index: number, fields: FormField[]) => {
    const newSteps = [...steps];
    newSteps[index].fields = fields;
    onChange(newSteps);
  };

  const removeStep = (index: number) => {
    onChange(steps.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    const newSteps = [...steps];
    const [movedStep] = newSteps.splice(index, 1);
    newSteps.splice(targetIndex, 0, movedStep);
    onChange(newSteps);
  };

  return (
    <div className="space-y-6">
      {/* ════ TOP MODE TABS: Manual Builder vs JSON Format ════ */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/90">
        <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
          {/* Tab 1: Manual Visual Builder */}
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "manual"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200/80"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-primary" />
            <span>Manual Builder</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === "manual"
                  ? "bg-primary/10 text-primary"
                  : "bg-slate-200/80 text-slate-600"
              }`}
            >
              {steps.length} Steps · {totalFields} Slots
            </span>
          </button>

          {/* Tab 2: JSON Code / Import */}
          <button
            type="button"
            onClick={() => setActiveTab("json")}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "json"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200/80"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>JSON Format & Import</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === "json"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200/80 text-slate-600"
              }`}
            >
              Sync & Import
            </span>
          </button>
        </div>

        {/* Right side helper info */}
        <div className="hidden md:flex items-center gap-2 pr-2 text-[11px] text-slate-400 font-medium">
          {activeTab === "manual" ? (
            <span>💡 Configure fields, drag to reorder, browse vault images & music tracks</span>
          ) : (
            <span>⚡ Paste or edit JSON to generate all steps and slots instantly</span>
          )}
        </div>
      </div>

      {/* ════ TAB 2 CONTENT: JSON EDITOR ════ */}
      {activeTab === "json" ? (
        <FormJsonEditor
          steps={steps}
          onApply={(newSteps) => {
            onChange(newSteps);
            // Ensure newly added steps are expanded
            setExpandedSteps((prev) => {
              const updated = { ...prev };
              newSteps.forEach((s) => {
                updated[s.id] = true;
              });
              return updated;
            });
          }}
          onSwitchToManual={() => setActiveTab("manual")}
        />
      ) : (
        /* ════ TAB 1 CONTENT: MANUAL BUILDER ════ */
        <div className="space-y-4">
          {steps.map((step, stepIndex) => {
            const isExpanded = expandedSteps[step.id] ?? true;

            return (
              <div
                key={step.id}
                className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all hover:border-primary/30"
              >
                {/* Step Header Bar */}
                <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                    <button
                      type="button"
                      onClick={() => toggleStepExpand(step.id)}
                      className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-600 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0">
                      {stepIndex + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {step.title || `Step ${stepIndex + 1}`}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {step.subtitle || "No subtitle"} · {step.fields.length} slot{step.fields.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Reorder and Delete Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={stepIndex === 0}
                      onClick={() => moveStep(stepIndex, "up")}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Move step up"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={stepIndex === steps.length - 1}
                      onClick={() => moveStep(stepIndex, "down")}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Move step down"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                    <button
                      type="button"
                      onClick={() => removeStep(stepIndex)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Step"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Step Body */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* Step Metadata Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-4 space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Step Title *
                        </label>
                        <input
                          value={step.title}
                          onChange={(e) => updateStepTitle(stepIndex, e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/60 transition-all placeholder:font-normal placeholder:text-slate-400 shadow-2xs"
                          placeholder="e.g. About You Two"
                        />
                      </div>

                      <div className="sm:col-span-4 space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Step Subtitle
                        </label>
                        <input
                          value={step.subtitle || ""}
                          onChange={(e) => updateStepSubtitle(stepIndex, e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/60 transition-all placeholder:text-slate-400 shadow-2xs"
                          placeholder="e.g. Basic details"
                        />
                      </div>

                      <div className="sm:col-span-4 space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Step Icon
                        </label>
                        <select
                          value={step.icon || "users"}
                          onChange={(e) => updateStepIcon(stepIndex, e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/60 transition-all cursor-pointer shadow-2xs"
                        >
                          {STEP_ICONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Step Description Helper */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Step Description (Optional helper note)
                      </label>
                      <input
                        value={step.description || ""}
                        onChange={(e) => updateStepDescription(stepIndex, e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/60 transition-all placeholder:text-slate-400 shadow-2xs"
                        placeholder="e.g. Personalize opening screen, names and photos"
                      />
                    </div>

                    {/* Slots / Fields in Step */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="mb-2.5 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-primary" /> Slots & Fields in this step
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {step.fields.length} defined
                        </span>
                      </div>
                      <FieldBuilder
                        fields={step.fields}
                        onChange={(fields) => updateStepFields(stepIndex, fields)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={addStep}
            className="w-full py-3.5 border-2 border-dashed border-slate-200 text-slate-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Add Form Step
          </button>
        </div>
      )}
    </div>
  );
};

export default FormBuilder;
