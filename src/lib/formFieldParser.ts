import { FormStep } from "@/components/dashboard/FormBuilder";
import { FormField } from "@/components/dashboard/FieldBuilder";

export interface ParseResult {
  steps: FormStep[];
  stepCount: number;
  fieldCount: number;
  warnings: string[];
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  stepCount?: number;
  fieldCount?: number;
  steps?: FormStep[];
  warnings?: string[];
}

// Convert camelCase or snake_case to Human Title
function humanizeKey(key: string): string {
  if (!key) return "Field";
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

// Sanitize field name to be a valid identifier (/^[a-z0-9_]+$/i)
function sanitizeFieldName(name: string, fallbackIdx: number): string {
  if (!name || typeof name !== "string") {
    return `field_${fallbackIdx + 1}`;
  }
  const cleaned = name.trim().replace(/[^a-zA-Z0-9_]/g, "_");
  if (!cleaned) {
    return `field_${fallbackIdx + 1}`;
  }
  // If starts with a number, prepend 'f_'
  if (/^[0-9]/.test(cleaned)) {
    return `f_${cleaned}`;
  }
  return cleaned;
}

// Map any legacy or frontend type to standard admin FieldBuilder type
function normalizeFieldType(rawType: any): FormField["type"] {
  const t = String(rawType || "").toLowerCase().trim();

  if (t === "textarea" || t === "longtext" || t === "message") {
    return "textarea";
  }
  if (t === "date" || t === "datetime" || t === "time") {
    return "date";
  }
  if (t === "select" || t === "dropdown" || t === "options" || t === "choice" || t === "radio") {
    return "select";
  }
  if (t === "image" || t === "photo" || t === "picture" || t === "gallery" || t === "file") {
    return "image";
  }
  if (t === "music" || t === "audio" || t === "song" || t === "soundtrack") {
    return "music";
  }

  // default to text (e.g. text, email, tel, url, number, string)
  return "text";
}

// Normalize Step Icon to a known or friendly icon
function normalizeStepIcon(rawIcon: any): string {
  const icon = String(rawIcon || "").toLowerCase().trim();
  if (!icon) return "users";

  const iconMap: Record<string, string> = {
    camera: "image",
    photos: "image",
    photo: "image",
    gallery: "image",
    audio: "music",
    song: "music",
    soundtrack: "music",
    sound: "music",
    user: "users",
    couple: "users",
    people: "users",
    letter: "file-text",
    message: "file-text",
    note: "file-text",
    mail: "file-text",
    love: "heart",
    reasons: "heart",
    magic: "sparkles",
    surprise: "gift",
    birthday: "cake",
    date: "calendar",
    gamepad: "sparkles",
    game: "sparkles",
    interactive: "sparkles",
  };

  return iconMap[icon] || icon;
}

// Normalize options array
function normalizeOptions(rawOptions: any): string[] {
  if (!Array.isArray(rawOptions)) return [];
  return rawOptions
    .map((opt) => {
      if (typeof opt === "string") return opt.trim();
      if (opt && typeof opt === "object") {
        return String(opt.label || opt.value || opt.name || "").trim();
      }
      return String(opt).trim();
    })
    .filter(Boolean);
}

// Normalize a single field
function normalizeField(rawField: any, fieldIdx: number, stepIdx: number, warnings: string[]): FormField {
  if (!rawField || typeof rawField !== "object") {
    warnings.push(`Step ${stepIdx + 1}, slot ${fieldIdx + 1}: Invalid field definition, defaulted.`);
    return {
      name: `field_${stepIdx + 1}_${fieldIdx + 1}`,
      label: `Field ${fieldIdx + 1}`,
      type: "text",
      placeholder: "",
      required: false,
    };
  }

  const rawName = String(rawField.name || rawField.key || rawField.id || "");
  const name = sanitizeFieldName(rawName, fieldIdx);
  if (rawName && rawName !== name) {
    warnings.push(`Field key "${rawName}" was sanitized to "${name}" to match valid identifier format.`);
  }

  const label = String(rawField.label || rawField.title || humanizeKey(name));
  const type = normalizeFieldType(rawField.type);
  const placeholder = typeof rawField.placeholder === "string" ? rawField.placeholder : "";

  // Normalize default value
  let defaultValue = "";
  if (rawField.defaultValue !== undefined && rawField.defaultValue !== null) {
    if (Array.isArray(rawField.defaultValue)) {
      defaultValue = JSON.stringify(rawField.defaultValue);
    } else if (typeof rawField.defaultValue === "object") {
      defaultValue = JSON.stringify(rawField.defaultValue);
    } else {
      defaultValue = String(rawField.defaultValue);
    }
  } else if (rawField.default_value !== undefined && rawField.default_value !== null) {
    if (Array.isArray(rawField.default_value)) {
      defaultValue = JSON.stringify(rawField.default_value);
    } else if (typeof rawField.default_value === "object") {
      defaultValue = JSON.stringify(rawField.default_value);
    } else {
      defaultValue = String(rawField.default_value);
    }
  }

  // Required: if explicitly specified, respect it.
  const required = rawField.required !== undefined ? Boolean(rawField.required) : false;

  const field: FormField = {
    name,
    label,
    type,
    placeholder,
    defaultValue: defaultValue || undefined,
    required,
  };

  // Optional attributes
  if (rawField.description && typeof rawField.description === "string") {
    field.description = rawField.description;
  }
  if (rawField.maxLength && !isNaN(Number(rawField.maxLength))) {
    field.maxLength = Number(rawField.maxLength);
  }
  if (rawField.maxSizeMB && !isNaN(Number(rawField.maxSizeMB))) {
    field.maxSizeMB = Number(rawField.maxSizeMB);
  }
  if (rawField.maxFiles && !isNaN(Number(rawField.maxFiles))) {
    field.maxFiles = Number(rawField.maxFiles);
  }
  if (rawField.multiple !== undefined) {
    field.multiple = Boolean(rawField.multiple);
  }
  if (rawField.searchable !== undefined) {
    field.searchable = Boolean(rawField.searchable);
  }
  if (rawField.s3Folder && typeof rawField.s3Folder === "string") {
    field.s3Folder = rawField.s3Folder;
  }
  if (Array.isArray(rawField.musicCategories)) {
    field.musicCategories = rawField.musicCategories.map(String).filter(Boolean);
  }

  // Select Options
  if (type === "select") {
    const opts = normalizeOptions(rawField.options);
    if (opts.length > 0) {
      field.options = opts;
    }
  }

  return field;
}

// Normalize a single step
function normalizeStep(rawStep: any, stepIdx: number, warnings: string[]): FormStep {
  const id = String(rawStep.id || `step_${stepIdx + 1}`).trim();
  const title = String(rawStep.title || rawStep.name || `Step ${stepIdx + 1}`).trim();
  const subtitle = typeof rawStep.subtitle === "string" ? rawStep.subtitle.trim() : "";
  const description = typeof rawStep.description === "string" ? rawStep.description.trim() : undefined;
  const icon = normalizeStepIcon(rawStep.icon);

  const rawFields = Array.isArray(rawStep.fields) ? rawStep.fields : [];
  const fields = rawFields.map((f: any, fIdx: number) => normalizeField(f, fIdx, stepIdx, warnings));

  return {
    id,
    title,
    subtitle,
    description,
    icon,
    fields,
  };
}

/**
 * Main parser: takes JSON string or parsed object, and safely returns FormStep[]
 */
export function parseAndNormalizeSteps(input: string | unknown): ParseResult {
  const warnings: string[] = [];

  let data: any = input;
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) {
      return { steps: [], stepCount: 0, fieldCount: 0, warnings: [] };
    }
    try {
      data = JSON.parse(trimmed);
    } catch (e: any) {
      throw new Error(`Invalid JSON syntax: ${e.message}`);
    }
  }

  if (!data) {
    return { steps: [], stepCount: 0, fieldCount: 0, warnings: [] };
  }

  // Case 1: Wrapped inside an object like { steps: [...] } or { form_fields: [...] } or { data: [...] }
  if (!Array.isArray(data) && typeof data === "object") {
    if (Array.isArray(data.steps)) {
      data = data.steps;
    } else if (Array.isArray(data.form_fields)) {
      data = data.form_fields;
    } else if (Array.isArray(data.fields)) {
      // Wrapped flat list of fields
      data = [
        {
          id: "step_1",
          title: "Customise Details",
          subtitle: "Fill in template fields",
          icon: "users",
          fields: data.fields,
        },
      ];
    } else {
      throw new Error("JSON must be an array of steps or contain a 'steps' or 'form_fields' property.");
    }
  }

  if (!Array.isArray(data)) {
    throw new Error("Expected an array of steps or fields.");
  }

  if (data.length === 0) {
    return { steps: [], stepCount: 0, fieldCount: 0, warnings: [] };
  }

  // Case 2: Array of fields directly (without step wrappers)
  const isFlatFields = data.every((item) => item && typeof item === "object" && !("fields" in item) && ("name" in item || "type" in item));

  if (isFlatFields) {
    warnings.push("Detected a flat list of fields. Grouped into a single Step automatically.");
    const fields = data.map((f, i) => normalizeField(f, i, 0, warnings));
    const step: FormStep = {
      id: "step_1",
      title: "Step 1",
      subtitle: "Customise Details",
      icon: "users",
      fields,
    };
    return {
      steps: [step],
      stepCount: 1,
      fieldCount: fields.length,
      warnings,
    };
  }

  // Case 3: Standard Array of Steps
  const steps: FormStep[] = data.map((s, idx) => normalizeStep(s, idx, warnings));
  const totalFields = steps.reduce((acc, s) => acc + s.fields.length, 0);

  return {
    steps,
    stepCount: steps.length,
    fieldCount: totalFields,
    warnings,
  };
}

/**
 * Validates JSON string without throwing
 */
export function validateJson(jsonString: string): ValidationResult {
  const trimmed = jsonString.trim();
  if (!trimmed) {
    return { isValid: true, stepCount: 0, fieldCount: 0, steps: [] };
  }

  try {
    const result = parseAndNormalizeSteps(trimmed);
    return {
      isValid: true,
      stepCount: result.stepCount,
      fieldCount: result.fieldCount,
      steps: result.steps,
      warnings: result.warnings,
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: err.message || "Invalid JSON",
    };
  }
}

/**
 * Cleanly serializes FormStep[] into readable JSON string, omitting private state (like _files)
 */
export function serializeStepsToJson(steps: FormStep[]): string {
  const cleanSteps = steps.map((step) => {
    const cleanFields = (step.fields || []).map((f) => {
      const { _files, ...rest } = f as any;
      // Remove empty optional keys to keep JSON concise and clean
      const cleaned: any = {
        name: rest.name,
        label: rest.label,
        type: rest.type,
      };

      if (rest.placeholder) cleaned.placeholder = rest.placeholder;
      if (rest.defaultValue !== undefined && rest.defaultValue !== "") {
        cleaned.defaultValue = rest.defaultValue;
      }
      cleaned.required = Boolean(rest.required);

      if (rest.description) cleaned.description = rest.description;
      if (rest.maxLength) cleaned.maxLength = rest.maxLength;
      if (rest.options && rest.options.length > 0) cleaned.options = rest.options;
      if (rest.multiple) cleaned.multiple = rest.multiple;
      if (rest.searchable) cleaned.searchable = rest.searchable;
      if (rest.maxFiles) cleaned.maxFiles = rest.maxFiles;
      if (rest.maxSizeMB) cleaned.maxSizeMB = rest.maxSizeMB;
      if (rest.s3Folder) cleaned.s3Folder = rest.s3Folder;
      if (rest.musicCategories && rest.musicCategories.length > 0) {
        cleaned.musicCategories = rest.musicCategories;
      }

      return cleaned;
    });

    const cleanStep: any = {
      id: step.id,
      title: step.title,
    };
    if (step.subtitle) cleanStep.subtitle = step.subtitle;
    if (step.description) cleanStep.description = step.description;
    cleanStep.icon = step.icon || "users";
    cleanStep.fields = cleanFields;

    return cleanStep;
  });

  return JSON.stringify(cleanSteps, null, 2);
}

/**
 * Standard Example Template JSON for quick testing & reference
 */
export const EXAMPLE_TEMPLATE_JSON: FormStep[] = [
  {
    id: "step_intro",
    title: "Welcome Story",
    subtitle: "Opening screen & couple names",
    description: "Configure opening titles, friend/couple names, and hero photo",
    icon: "sparkles",
    fields: [
      {
        name: "recipientName",
        label: "Best Friend / Partner Name",
        type: "text",
        placeholder: "e.g. Sarah / Bestie",
        defaultValue: "My Best Friend",
        required: true,
        maxLength: 60,
        description: "Displays prominently in the welcome screen header",
      },
      {
        name: "welcomeMessage",
        label: "Welcome Note",
        type: "textarea",
        placeholder: "Write a heartfelt opening message...",
        defaultValue: "Some friendships deserve more than words. They deserve an unforgettable experience.",
        required: false,
        maxLength: 500,
      },
      {
        name: "coverPhoto",
        label: "Cover Portrait Photo",
        type: "image",
        placeholder: "",
        required: true,
        multiple: false,
        maxSizeMB: 5,
        s3Folder: "templates",
        description: "High resolution portrait photo for the intro card",
        defaultValue: "",
      },
    ],
  },
  {
    id: "step_memories",
    title: "Memory Gallery",
    subtitle: "Photos, captions & background soundtrack",
    description: "Upload memory photos and choose an ambient background song",
    icon: "image",
    fields: [
      {
        name: "memory1Photo",
        label: "Chapter 1 Memory Photo",
        type: "image",
        placeholder: "",
        required: false,
        multiple: false,
        maxSizeMB: 5,
        s3Folder: "templates",
        description: "First milestone memory photo",
        defaultValue: "",
      },
      {
        name: "memory1Caption",
        label: "Chapter 1 Caption",
        type: "text",
        placeholder: "e.g. Where our journey began",
        defaultValue: "Where It All Began",
        required: false,
        maxLength: 80,
      },
      {
        name: "galleryPhotos",
        label: "Additional Gallery Snaps",
        type: "image",
        placeholder: "",
        required: false,
        multiple: true,
        maxFiles: 6,
        maxSizeMB: 5,
        s3Folder: "templates",
        description: "Upload up to 6 candid moments",
        defaultValue: "",
      },
      {
        name: "backgroundSong",
        label: "Background Soundtrack",
        type: "music",
        placeholder: "",
        required: false,
        musicCategories: ["Acoustic", "Romantic", "Celebration"],
        description: "Default melody played during the wish experience",
        defaultValue: "",
      },
    ],
  },
  {
    id: "step_options",
    title: "Personalization Details",
    subtitle: "Event date & accent color choice",
    icon: "calendar",
    fields: [
      {
        name: "eventDate",
        label: "Special Date",
        type: "date",
        placeholder: "",
        required: false,
        defaultValue: new Date().toISOString().split("T")[0],
      },
      {
        name: "themeStyle",
        label: "Card Theme Style",
        type: "select",
        placeholder: "Select theme",
        options: ["Rose Gold Bloom", "Midnight Constellation", "Emerald Velvet", "Golden Sunset"],
        defaultValue: "Rose Gold Bloom",
        multiple: false,
        searchable: false,
        required: true,
      },
    ],
  },
];

export const EXAMPLE_JSON_STRING = JSON.stringify(EXAMPLE_TEMPLATE_JSON, null, 2);
