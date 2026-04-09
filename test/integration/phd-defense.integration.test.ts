import { describe, test, expect } from "bun:test";
import { DEFAULT_CONFIG } from "../../frameworks/phd-defense/types";

describe("PhD Defense Integration", () => {
  test("framework config structure is valid", () => {
    expect(DEFAULT_CONFIG).toBeDefined();
    expect(DEFAULT_CONFIG.models).toBeDefined();
  });

  test("exports run function", async () => {
    const mod = await import("../../frameworks/phd-defense");
    expect(typeof mod.run).toBe("function");
  });
});
