import type { LLMProvider } from "@core/types";
import { parseJSON } from "@core/orchestrator";
import type { Case, Prosecution, Defense, CourtroomConfig } from "./types";

export function buildDefensePrompt(
  caseInput: Case,
  prosecution: Prosecution,
  _config: CourtroomConfig
): string {
  const contextContent = caseInput.context.join("\n\n---\n\n");

  const exhibitsText = prosecution.exhibits
    .map(
      (ex, i) => `
**Exhibit ${i + 1}:**
- Source: "${ex.sourceQuote}"
- Target: "${ex.targetQuote}"
- Alleged Harm: "${ex.harm}"
`
    )
    .join("\n");

  return `You are a defense attorney in a courtroom evaluation system. The prosecution has built a case for "GUILTY" (take action). Your role is to mount a rebuttal arguing for "NOT GUILTY" (don't take action, or take different action).

## THE QUESTION
${caseInput.question}

## CONTEXT MATERIALS
${contextContent}

## PROSECUTION'S CASE

**Case Statement:**
${prosecution.caseStatement}

**Exhibits:**
${exhibitsText}

**Harm Analysis:**
${prosecution.harmAnalysis}

## YOUR TASK

Mount a defense with the following structure:

1. **COUNTER-ARGUMENT** - Your central thesis for why "not guilty" is the correct verdict

2. **EXHIBIT CHALLENGES** - For each prosecution exhibit, challenge its validity:
   - Is the evidence actually conclusive?
   - Does it really prove what prosecution claims?
   - Is there an alternative interpretation?

3. **HARM DISPUTE** - Why is the prosecution's harm analysis overstated or incorrect?

4. **ALTERNATIVE EXPLANATION** - Why the current state (not taking action) may already be correct, or why different action is needed

## LEGAL STANDARDS

- You MUST address the prosecution's strongest arguments
- Challenge evidence, not just assert the opposite
- Provide alternative interpretations grounded in the context
- Use legal terminology naturally (rebuttal, challenge, dispute)

## OUTPUT FORMAT

Return valid JSON matching this structure:

{
  "counterArgument": "central thesis for not guilty",
  "exhibitChallenges": [
    {
      "exhibit": 1,
      "challenge": "why this exhibit is weak/misleading/incorrect"
    }
  ],
  "harmDispute": "why harm is overstated or wrong",
  "alternative": "alternative explanation for not guilty"
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks.`;
}

export function parseDefenseResponse(
  text: string,
  prosecution: Prosecution
): Defense {
  const defense = parseJSON<Defense>(text);
  validateDefense(defense, prosecution);
  return defense;
}

export async function defend(
  caseInput: Case,
  prosecution: Prosecution,
  config: CourtroomConfig,
  provider: LLMProvider
): Promise<Defense> {
  const prompt = buildDefensePrompt(caseInput, prosecution, config);

  const response = await provider.call({
    model: config.models.defense,
    maxTokens: 4096,
    temperature: 0.7,
    messages: [{ role: "user", content: prompt }],
  });

  return parseDefenseResponse(response.content, prosecution);
}

function validateDefense(defense: Defense, prosecution: Prosecution): void {
  // Check that counter-argument exists and is substantial
  if (!defense.counterArgument || defense.counterArgument.length < 50) {
    throw new Error("Defense counter-argument too brief or missing");
  }

  // Check that there's at least one exhibit challenge
  if (defense.exhibitChallenges.length === 0) {
    throw new Error("Defense must challenge at least one exhibit");
  }

  // Check that exhibit challenges reference valid exhibit numbers
  for (const challenge of defense.exhibitChallenges) {
    if (
      challenge.exhibit < 1 ||
      challenge.exhibit > prosecution.exhibits.length
    ) {
      throw new Error(
        `Invalid exhibit number in challenge: ${challenge.exhibit}`
      );
    }
  }

  // Check harm dispute exists
  if (!defense.harmDispute || defense.harmDispute.length < 50) {
    throw new Error("Defense harm dispute too brief or missing");
  }

  // Check alternative explanation exists
  if (!defense.alternative || defense.alternative.length < 50) {
    throw new Error("Defense alternative explanation too brief or missing");
  }
}
