import { describe, expect, it } from "vitest";
import { ruleJsonSchema } from "../../src/rules/schema.js";

describe("ruleJsonSchema", () => {
  it("produces a JSON Schema object with the rule id pattern", () => {
    const schema = ruleJsonSchema();
    expect(schema.type).toBe("object");
    const props = schema.properties as Record<string, { pattern?: string }>;
    expect(props.id.pattern).toBe("^DPDP-C-\\d{3}$");
  });

  it("marks provisions, rationale_plain and explainer_url as required", () => {
    const schema = ruleJsonSchema();
    expect(schema.required).toEqual(
      expect.arrayContaining(["provisions", "rationale_plain", "explainer_url"]),
    );
  });
});
