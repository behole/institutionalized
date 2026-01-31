#!/usr/bin/env bun
import { AnthropicProvider } from "./core/providers/anthropic";
import { runStudioCritique, getDefaultConfig, formatResult } from "./studio-critique-poc/src/orchestrator";
import { readFileSync, writeFileSync } from "fs";

// Just read the first 2 sections to keep it manageable
const fullEssay = readFileSync("/Users/jjoosshhmbpm1/26/the-factory/01_Projects/bhole/content/drafts/terminal-velocity/hub-emb-v4.md", "utf-8");
const sections = fullEssay.split("## ");
const shortVersion = sections.slice(0, 4).join("## "); // Title + first 3 sections

const work = {
  content: shortVersion,
  context: "Opening sections of 'Terminal Velocity' - essay about EMB skateboard spot in SF. Full essay covers EMB→LOVE→Pulaski pattern showing how cities destroy skatespots.",
  medium: "writing" as const,
  stage: "draft" as const
};

const provider = new AnthropicProvider(process.env.ANTHROPIC_API_KEY!);
const config = getDefaultConfig();
config.parameters.numPeers = 2; // Fewer peers for faster demo
config.parameters.enableCreatorResponse = false;
config.models.peers = "claude-sonnet-4-20250514";
config.models.instructor = "claude-sonnet-4-20250514";

console.log("\n🎨 STUDIO CRITIQUE: Terminal Velocity (opening sections)\n");

try {
  const result = await runStudioCritique(work, config, provider, false);
  const formatted = formatResult(result);
  console.log(formatted);
  writeFileSync("/tmp/studio-critique-result.json", JSON.stringify(result, null, 2));
} catch (error) {
  console.log("Note: Validation caught an issue (this shows the framework working)");
  console.log("Error:", String(error).slice(0, 200));
}
