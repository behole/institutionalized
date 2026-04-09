import { describe, test, expect } from "bun:test";

describe("Peer Review Integration", () => {
  test("exports run function", async () => {
    const mod = await import("../../frameworks/peer-review");
    expect(typeof mod.run).toBe("function");
  });

  test("module imports successfully", async () => {
    const mod = await import("../../frameworks/peer-review");
    expect(mod).toBeDefined();
  });
});
