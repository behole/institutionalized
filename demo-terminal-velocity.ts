#!/usr/bin/env bun
import { AnthropicProvider } from "./core/providers/anthropic";
import { runStudioCritique, getDefaultConfig } from "./studio-critique-poc/src/orchestrator";
import { readFileSync } from "fs";

const essay = readFileSync("/Users/jjoosshhmbpm1/26/the-factory/01_Projects/bhole/content/drafts/terminal-velocity/hub-emb-v4.md", "utf-8");

const work = {
  content: essay,
  context: "Essay about how cities destroy skatespots. EMB → LOVE → Pulaski pattern. Hub essay for (b)hole series. Already reviewed by critic panel (Didion, Talese, Kael, Thompson, Sontag) - got A- average, marked ready to publish.",
  medium: "writing" as const,
  stage: "final" as const
};

const provider = new AnthropicProvider(process.env.ANTHROPIC_API_KEY!);
const config = getDefaultConfig();
config.parameters.numPeers = 3;
config.parameters.enableCreatorResponse = false;
config.models.peers = "claude-sonnet-4-20250514";
config.models.instructor = "claude-sonnet-4-20250514";

console.log("\n🎨 STUDIO CRITIQUE: Terminal Velocity\n");
const result = await runStudioCritique(work, config, provider, true);
console.log("\n📊 VERDICT:", result.instructorAssessment.readyToShip ? "✅ READY" : "❌ NEEDS REVISION");
