/**
 * Orchestrator - coordinates the full studio critique process
 */

import type { LLMProvider } from "../../core/types";
import type {
  Work,
  PeerCritique,
  InstructorAssessment,
  CreatorResponse,
  StudioCritiqueConfig,
  StudioCritiqueResult,
} from "./types";
import { provideCritique } from "./peer";
import { assessWork } from "./instructor";
import { respondToCritique } from "./creator";

export async function runStudioCritique(
  work: Work,
  config: StudioCritiqueConfig,
  provider: LLMProvider,
  verbose: boolean = false
): Promise<StudioCritiqueResult> {
  if (verbose) {
    console.log("\n🎨 STUDIO CRITIQUE SESSION INITIATED");
    console.log(`Configuration:`);
    console.log(`  - Peers: ${config.parameters.numPeers}`);
    console.log(`  - Creator Response: ${config.parameters.enableCreatorResponse ? "Enabled" : "Disabled"}`);
    console.log(`  - Medium: ${work.medium || "general"}`);
    console.log(`  - Stage: ${work.stage || "unknown"}`);
    console.log("\n");
  }

  // Phase 1: Peer Critiques (parallel)
  if (verbose) {
    console.log("👥 PHASE 1: PEER CRITIQUES");
    console.log(`${config.parameters.numPeers} peers providing feedback...\n`);
  }

  const critiquePromises = Array.from(
    { length: config.parameters.numPeers },
    (_, i) => provideCritique(i + 1, work, config, provider)
  );

  const critiques = await Promise.all(critiquePromises);

  if (verbose) {
    critiques.forEach((critique) => {
      console.log(`${critique.peer}:`);
      console.log(`  Works: ${critique.whatWorks.length}`);
      console.log(`  Doesn't: ${critique.whatDoesnt.length}`);
      console.log(`  Questions: ${critique.questions.length}`);
      console.log();
    });
  }

  // Phase 2: Instructor Assessment
  if (verbose) {
    console.log("👨‍🏫 PHASE 2: INSTRUCTOR ASSESSMENT");
    console.log("Synthesizing peer feedback...\n");
  }

  const assessment = await assessWork(work, critiques, config, provider);

  if (verbose) {
    console.log(`Assessment:`);
    console.log(`  Ready to ship: ${assessment.readyToShip ? "Yes" : "No"}`);
    console.log(`  Strengths to keep: ${assessment.strengthsToKeep.length}`);
    console.log(`  Areas to revise: ${assessment.areasToRevise.length}`);
    console.log();
  }

  // Phase 3: Creator Response (optional)
  let creatorResponse: CreatorResponse | undefined;

  if (config.parameters.enableCreatorResponse) {
    if (verbose) {
      console.log("✍️  PHASE 3: CREATOR RESPONSE");
      console.log("Creator responding to feedback...\n");
    }

    creatorResponse = await respondToCritique(
      work,
      critiques,
      assessment,
      config,
      provider
    );

    if (verbose) {
      console.log(`Creator response:`);
      console.log(`  Clarifications: ${creatorResponse.clarifications.length}`);
      console.log(`  Revision plan provided: Yes`);
      console.log();
    }
  }

  if (verbose) {
    console.log("✅ STUDIO CRITIQUE COMPLETE\n");
  }

  return {
    work,
    peerCritiques: critiques,
    instructorAssessment: assessment,
    creatorResponse,
    metadata: {
      timestamp: new Date().toISOString(),
      config,
    },
  };
}

export function getDefaultConfig(): StudioCritiqueConfig {
  return {
    models: {
      peers: "claude-3-5-sonnet-20241022",
      instructor: "claude-3-7-sonnet-20250219",
      creator: "claude-3-5-sonnet-20241022",
    },
    parameters: {
      numPeers: 3,
      enableCreatorResponse: true,
      peerTemperature: 0.7,
      instructorTemperature: 0.5,
    },
  };
}

export function formatResult(result: StudioCritiqueResult): string {
  let output = "\n" + "=".repeat(80) + "\n";
  output += "STUDIO CRITIQUE\n";
  output += "=".repeat(80) + "\n\n";

  output += `READY TO SHIP: ${result.instructorAssessment.readyToShip ? "YES" : "NO"}\n\n`;

  output += `INSTRUCTOR SYNTHESIS:\n${result.instructorAssessment.synthesis}\n\n`;

  output += `TECHNICAL NOTES:\n${result.instructorAssessment.technicalNotes}\n\n`;
  output += `CONCEPTUAL NOTES:\n${result.instructorAssessment.conceptualNotes}\n\n`;

  if (result.instructorAssessment.strengthsToKeep.length > 0) {
    output += `STRENGTHS TO KEEP:\n`;
    result.instructorAssessment.strengthsToKeep.forEach((s, i) => {
      output += `${i + 1}. ${s}\n`;
    });
    output += `\n`;
  }

  if (result.instructorAssessment.areasToRevise.length > 0) {
    output += `AREAS TO REVISE:\n`;
    result.instructorAssessment.areasToRevise.forEach((a, i) => {
      output += `${i + 1}. ${a}\n`;
    });
    output += `\n`;
  }

  output += `NEXT STEPS:\n${result.instructorAssessment.nextSteps}\n\n`;

  output += `PEER CRITIQUES:\n\n`;
  result.peerCritiques.forEach((critique) => {
    output += `${critique.peer}:\n`;
    output += `  Overall: ${critique.overallImpression}\n\n`;

    if (critique.whatWorks.length > 0) {
      output += `  What Works:\n`;
      critique.whatWorks.forEach((w) => (output += `    - ${w}\n`));
      output += `\n`;
    }

    if (critique.whatDoesnt.length > 0) {
      output += `  What Doesn't:\n`;
      critique.whatDoesnt.forEach((d) => (output += `    - ${d}\n`));
      output += `\n`;
    }

    if (critique.questions.length > 0) {
      output += `  Questions:\n`;
      critique.questions.forEach((q) => (output += `    - ${q}\n`));
      output += `\n`;
    }
  });

  if (result.creatorResponse) {
    output += `CREATOR RESPONSE:\n\n`;
    output += `Intent vs Reception:\n${result.creatorResponse.intendedVsReceived}\n\n`;
    output += `Revision Plan:\n${result.creatorResponse.revisionPlan}\n\n`;

    if (result.creatorResponse.clarifications.length > 0) {
      output += `Clarifications:\n`;
      result.creatorResponse.clarifications.forEach((c, i) => {
        output += `${i + 1}. ${c}\n`;
      });
      output += `\n`;
    }
  }

  output += "=".repeat(80) + "\n";

  return output;
}
