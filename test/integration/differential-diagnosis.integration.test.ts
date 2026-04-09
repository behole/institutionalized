import { describe, test, expect } from "bun:test";
import { DEFAULT_CONFIG } from "../../frameworks/differential-diagnosis/types";

describe("Differential Diagnosis Integration", () => {
  test("framework config structure is valid", () => {
    expect(DEFAULT_CONFIG).toBeDefined();
    expect(DEFAULT_CONFIG.models).toBeDefined();
  });

  test("exports run function", async () => {
    const mod = await import("../../frameworks/differential-diagnosis");
    expect(typeof mod.run).toBe("function");
  });
});
