/**
 * Orchestrator for Studio Critique framework
 */

import type { LLMProvider } from "@core/types";
import type { CreativeWork, StudioConfig, StudioResult } from "./types";
import { observeWork, critiqueWork } from "./peer";
import { respondToFeedback } from "./creator";
import { synthesizeCritique } from "./instructor";

export async function runStudio(
  work: CreativeWork,
  config: StudioConfig,
  provider: LLMProvider,
  verbose: boolean = false
): Promise<StudioResult> {
  if (verbose) {
    console.log("\n" + "=".repeat(80));
    console.log("🎨 STUDIO CRITIQUE SESSION");
    console.log("=".repeat(80));
    console.log(`\nWork type: ${work.workType || "general"}`);
    console.log(`Peers: ${config.parameters.numPeers}\n`);
  }

  // Phase 1: Silent observation (parallel)
  if (verbose) {
    console.log("👀 PHASE 1: SILENT OBSERVATION");
    console.log("Peers observing the work in silence...\n");
  }

  const observationPromises = Array.from(
    { length: config.parameters.numPeers },
    (_, i) => observeWork(i + 1, work, config, provider)
  );

  const observations = await Promise.all(observationPromises);

  if (verbose) {
    observations.forEach((obs) => {
      console.log(`${obs.peer}:`);
      console.log(`  Observations: ${obs.observations.length}`);
      console.log(`  Questions: ${obs.questions.length}`);
      console.log(`  Reactions: ${obs.reactions.length}`);
    });
    console.log();
  }

  // Phase 2: Structured critique (parallel)
  if (verbose) {
    console.log("💬 PHASE 2: STRUCTURED CRITIQUE");
    console.log("Peers providing feedback...\n");
  }

  const critiquePromises = Array.from(
    { length: config.parameters.numPeers },
    (_, i) => critiqueWork(i + 1, work, config, provider)
  );

  const critiques = await Promise.all(critiquePromises);

  if (verbose) {
    critiques.forEach((critique) => {
      console.log(`${critique.peer}:`);
      console.log(`  Strengths: ${critique.strengths.length}`);
      console.log(`  Weaknesses: ${critique.weaknesses.length}`);
      console.log(`  Suggestions: ${critique.suggestions.length}`);
    });
    console.log();
  }

  // Phase 3: Creator response (optional)
  let creatorResponse;

  if (config.parameters.enableCreatorResponse) {
    if (verbose) {
      console.log("✍️  PHASE 3: CREATOR RESPONSE");
      console.log("Creator responding to feedback...\n");
    }

    creatorResponse = await respondToFeedback(
      work,
      observations,
      critiques,
      config,
      provider
    );

    if (verbose) {
      console.log(`Clarifications: ${creatorResponse.clarifications.length}`);
      console.log(`Intentions shared: ${creatorResponse.intentions.length}`);
      console.log(`Takeaways: ${creatorResponse.takeaways.length}\n`);
    }
  }

  // Phase 4: Instructor synthesis
  if (verbose) {
    console.log("👨‍🏫 PHASE 4: INSTRUCTOR SYNTHESIS");
    console.log("Instructor synthesizing feedback...\n");
  }

  const synthesis = await synthesizeCritique(
    work,
    observations,
    critiques,
    creatorResponse,
    config,
    provider
  );

  if (verbose) {
    console.log("=".repeat(80));
    console.log("INSTRUCTOR SYNTHESIS");
    console.log("=".repeat(80));
    console.log(`\nOverall: ${synthesis.overallAssessment}\n`);

    console.log("Core Feedback:");
    synthesis.coreFeedback.forEach((fb, i) => {
      console.log(`  ${i + 1}. ${fb}`);
    });

    console.log(`\nPrioritized Suggestions:`);
    synthesis.prioritizedSuggestions.forEach((sug, i) => {
      console.log(`  ${i + 1}. ${sug}`);
    });

    console.log(`\nEncouragement:`);
    console.log(`  ${synthesis.encouragement}\n`);

    console.log("Next Steps:");
    synthesis.nextSteps.forEach((step, i) => {
      console.log(`  ${i + 1}. ${step}`);
    });

    console.log("\n" + "=".repeat(80) + "\n");
  }

  return {
    work,
    observations,
    critiques,
    creatorResponse,
    synthesis,
    metadata: {
      timestamp: new Date().toISOString(),
      numPeers: config.parameters.numPeers,
      config,
    },
  };
}
