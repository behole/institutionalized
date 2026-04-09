import { describe, test, expect } from "bun:test";
import { DEFAULT_CONFIG } from "../../frameworks/six-hats/types";

describe("Six Hats Integration", () => {
  test("framework config structure is valid", () => {
    expect(DEFAULT_CONFIG).toBeDefined();
    expect(DEFAULT_CONFIG.models).toBeDefined();
    expect(DEFAULT_CONFIG.models.hat).toBeDefined();
    expect(DEFAULT_CONFIG.models.facilitator).toBeDefined();
    expect(typeof DEFAULT_CONFIG.parameters.temperature).toBe("number");
  });

  test("exports run function", async () => {
    const mod = await import("../../frameworks/six-hats");
    expect(typeof mod.run).toBe("function");
  });
});
