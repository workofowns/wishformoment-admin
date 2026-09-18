import { describe, it, expect } from "vitest";
import { parseAndNormalizeSteps, validateJson, serializeStepsToJson } from "./formFieldParser";
import fs from "fs";
import path from "path";

describe("formFieldParser", () => {
  it("parses the friendship special-surprise form_field.json", () => {
    const filePath = path.resolve(
      __dirname,
      "../../../wishformoment-frontend/src/components/templates/friendship/best-friends/special-surprise/form_field.json"
    );
    const jsonContent = fs.readFileSync(filePath, "utf-8");
    const result = parseAndNormalizeSteps(jsonContent);

    expect(result.steps.length).toBe(4);
    expect(result.fieldCount).toBe(55);

    // Verify Step 1
    const step1 = result.steps[0];
    expect(step1.id).toBe("step_intro");
    expect(step1.title).toBe("Welcome Story (Phase 1)");
    expect(step1.icon).toBe("sparkles");
    expect(step1.fields.length).toBe(14);

    const friendNameField = step1.fields[0];
    expect(friendNameField.name).toBe("friendName");
    expect(friendNameField.type).toBe("text");
    expect(friendNameField.required).toBe(true);
    expect(friendNameField.defaultValue).toBe("My Best Friend");

    // Check image field
    const imageField = step1.fields.find((f) => f.name === "p1Polaroid1Img");
    expect(imageField).toBeDefined();
    expect(imageField?.type).toBe("image");

    // Verify serialization round-trip
    const serialized = serializeStepsToJson(result.steps);
    const roundTrip = parseAndNormalizeSteps(serialized);
    expect(roundTrip.steps.length).toBe(4);
    expect(roundTrip.fieldCount).toBe(55);
  });

  it("parses the wedding engagement-invitation form_field.json", () => {
    const filePath = path.resolve(
      __dirname,
      "../../../wishformoment-frontend/src/components/templates/wedding/wedding-invitations/engagement-invitation/form_field.json"
    );
    const jsonContent = fs.readFileSync(filePath, "utf-8");
    const result = parseAndNormalizeSteps(jsonContent);

    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.fieldCount).toBeGreaterThan(0);

    // Verify all names match valid identifier regex
    result.steps.forEach((step) => {
      step.fields.forEach((field) => {
        expect(/^[a-z0-9_]+$/i.test(field.name)).toBe(true);
      });
    });
  });

  it("handles flat array of fields automatically", () => {
    const flatFields = [
      { name: "personName", label: "Person Name", type: "text" },
      { name: "partnerName", label: "Partner Name", type: "text" },
    ];
    const result = parseAndNormalizeSteps(flatFields);
    expect(result.steps.length).toBe(1);
    expect(result.fieldCount).toBe(2);
    expect(result.steps[0].fields[0].name).toBe("personName");
  });

  it("validates invalid JSON safely", () => {
    const val = validateJson("{ invalid json ");
    expect(val.isValid).toBe(false);
    expect(val.error).toBeDefined();
  });
});
