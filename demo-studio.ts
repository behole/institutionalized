#!/usr/bin/env bun

/**
 * Studio Critique Demo: Skateboarding Essay
 * Shows peer + instructor feedback on creative work
 */

import { AnthropicProvider } from "./core/providers/anthropic";
import { runStudioCritique, getDefaultConfig, formatResult } from "./studio-critique-poc/src/orchestrator";
import type { Work } from "./studio-critique-poc/src/types";

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("STUDIO CRITIQUE DEMO: Skateboarding Essay");
  console.log("=".repeat(80) + "\n");

  // The essay to critique
  const work: Work = {
    content: `# The Paradox of Authenticity in Skateboarding

Skateboarding occupies a strange cultural space. It's simultaneously mainstream and underground, corporate and anti-establishment, mass-produced and DIY. This tension isn't a bug—it's the core of what makes skateboarding compelling.

When Nike entered skateboarding in the early 2000s, the community reacted with fury. Here was the ultimate corporate entity trying to co-opt their counterculture. Yet today, Nike SB is respected. What changed? The answer reveals something fundamental about authenticity.

Authenticity in skateboarding isn't about purity or refusing corporate money. It's about respect for the culture. Nike earned credibility not by throwing money around, but by hiring actual skaters, making good shoes, and supporting the community. They proved that mainstream success and cultural authenticity aren't mutually exclusive—if you do it right.

The lesson extends beyond skateboarding. Every subculture faces this tension when it grows. Music, art, fashion—all grapple with the same question: Can you be both popular and authentic? Skateboarding's answer is nuanced: Yes, but only if you understand and respect what came before.

This matters because culture moves in cycles. What's underground today might be mainstream tomorrow. The question isn't whether to resist or embrace that movement, but how to navigate it without losing what made the culture meaningful in the first place.

Skateboarding figured this out. The rest of culture is still learning.`,
    context: "This essay explores the tension between mainstream acceptance and underground authenticity in skateboarding. I'm using Nike SB as a case study to show how authenticity isn't about purity but about cultural respect. Target audience is both skaters and people interested in how subcultures handle growth.",
    medium: "writing",
    stage: "draft"
  };

  // Setup provider
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Error: ANTHROPIC_API_KEY environment variable not set");
    process.exit(1);
  }

  const provider = new AnthropicProvider(apiKey);

  // Configure studio critique
  const config = getDefaultConfig();
  config.parameters.numPeers = 3;
  config.parameters.enableCreatorResponse = false; // Skip for demo
  config.models.peers = "claude-sonnet-4-20250514";
  config.models.instructor = "claude-sonnet-4-20250514";
  config.models.creator = "claude-sonnet-4-20250514";

  console.log("🎨 Running Studio Critique...");
  console.log(`   - ${config.parameters.numPeers} peers providing feedback`);
  console.log(`   - Instructor synthesis + guidance`);
  console.log(`   - Creator response to critique`);
  console.log("\n");

  try {
    const result = await runStudioCritique(work, config, provider, true);

    // Use the built-in formatter
    const formatted = formatResult(result);
    console.log(formatted);

  } catch (error) {
    console.error(`\n❌ Error: ${error}`);
    process.exit(1);
  }
}

main();
