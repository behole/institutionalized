import { parseJSON } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";
import type {
  Case,
  Prosecution,
  Defense,
  JurorDeliberation,
  CourtroomConfig,
  Vote,
} from "./types";

// LLMProvider is passed to runner.runParallel() in orchestrator.ts
// This file exports prompt-building and response-parsing for jury deliberation
type _LLMProviderRef = LLMProvider; // referenced via orchestrator FrameworkRunner

export function buildJurorPrompt(
  caseInput: Case,
  prosecution: Prosecution,
  defense: Defense,
  _config: CourtroomConfig,
  jurorNumber: number
): string {
  const exhibitsText = prosecution.exhibits
    .map(
      (ex, i) => `
**Prosecution Exhibit ${i + 1}:**
"${ex.sourceQuote}" → "${ex.targetQuote}"
Alleged harm: ${ex.harm}

**Defense Challenge ${i + 1}:**
${defense.exhibitChallenges.find((c) => c.exhibit === i + 1)?.challenge || "No challenge filed"}
`
    )
    .join("\n");

  return `You are Juror ${jurorNumber} in a courtroom evaluation system. You must independently evaluate the case and cast a vote.

## THE QUESTION
${caseInput.question}

## PROSECUTION'S CASE
${prosecution.caseStatement}

${exhibitsText}

**Prosecution's Harm Analysis:**
${prosecution.harmAnalysis}

## DEFENSE'S REBUTTAL

**Counter-Argument:**
${defense.counterArgument}

**Harm Dispute:**
${defense.harmDispute}

**Alternative Explanation:**
${defense.alternative}

## YOUR TASK

1. **DELIBERATE** - Reason through the case. Consider:
   - Is the prosecution's evidence convincing?
   - Does the defense raise valid objections?
   - What is the strength of each side's argument?
   - What is the actual risk/benefit of guilty vs. not guilty?

2. **VOTE** - Cast your vote:
   - **"guilty"** - Take action, proceed, accept (prosecution convinced you)
   - **"not_guilty"** - Don't take action, or take different action (defense convinced you)
   - **"abstain"** - Cannot decide based on available evidence

## STANDARDS

- You are INDEPENDENT - don't just agree with one side
- You must EXPLAIN your reasoning before voting
- Your reasoning should be SUBSTANTIVE (at least 100 words)
- You cannot vote without reasoning

## OUTPUT FORMAT

Return valid JSON matching this structure:

{
  "reasoning": "your deliberation process and analysis",
  "vote": "guilty" | "not_guilty" | "abstain"
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks.`;
}

export function parseJurorVerdict(
  text: string,
  jurorNumber: number
): JurorDeliberation {
  const deliberation = parseJSON<JurorDeliberation>(text);
  validateJurorDeliberation(jurorNumber, deliberation);
  return deliberation;
}

function validateJurorDeliberation(
  jurorNumber: number,
  deliberation: JurorDeliberation
): void {
  // Check reasoning exists and is substantial
  if (!deliberation.reasoning || deliberation.reasoning.length < 100) {
    throw new Error(
      `Juror ${jurorNumber}: Reasoning too brief (min 100 characters)`
    );
  }

  // Check vote is valid
  const validVotes: Vote[] = ["guilty", "not_guilty", "abstain"];
  if (!validVotes.includes(deliberation.vote)) {
    throw new Error(
      `Juror ${jurorNumber}: Invalid vote "${deliberation.vote}"`
    );
  }
}
