import Anthropic from "@anthropic-ai/sdk";
import type {
  Case,
  Prosecution,
  Defense,
  JuryVerdict,
  Verdict,
  CourtroomConfig,
  Decision,
} from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function renderVerdict(
  caseInput: Case,
  prosecution: Prosecution,
  defense: Defense,
  jury: JuryVerdict,
  config: CourtroomConfig
): Promise<Verdict> {
  console.log(`\n⚖️  Judge deliberating...`);

  const juryAnalysis = jury.jurors
    .map(
      (j, i) => `
**Juror ${i + 1}: ${j.vote.toUpperCase()}**
${j.reasoning}
`
    )
    .join("\n---\n");

  const prompt = `You are the judge in a courtroom evaluation system. You must render a final verdict after hearing from the prosecution, defense, and jury.

## THE QUESTION
${caseInput.question}

## PROSECUTION'S CASE
${prosecution.caseStatement}

**Evidence:**
${prosecution.exhibits.map((ex, i) => `Exhibit ${i + 1}: "${ex.sourceQuote}" → "${ex.targetQuote}" (Harm: ${ex.harm})`).join("\n")}

**Harm Analysis:**
${prosecution.harmAnalysis}

## DEFENSE'S REBUTTAL
${defense.counterArgument}

**Harm Dispute:**
${defense.harmDispute}

**Alternative:**
${defense.alternative}

## JURY VERDICT
**Votes:** ${jury.guiltyCount} guilty, ${jury.notGuiltyCount} not guilty, ${jury.abstainCount} abstain
**Threshold:** ${config.parameters.juryThreshold} guilty votes needed
**Proceeding:** ${jury.proceedsToJudge ? "Yes" : "No (case dismissed)"}

${juryAnalysis}

## YOUR TASK

As the judge, you must:

1. **SYNTHESIZE** all perspectives (prosecution, defense, jury)
2. **WEIGH EVIDENCE** - Which side's arguments are stronger?
3. **RENDER VERDICT** - Your decision (can override jury if reasoning demands it)
4. **PROVIDE RATIONALE** - One-sentence summary of why
5. **SPECIFY ACTIONS** (if guilty) - What specifically should be done?

## VERDICTS

- **"guilty"** - Take the proposed action (answer "yes" to the question)
- **"not_guilty"** - Don't take the action, or take different action (answer "no")
- **"dismissed"** - Insufficient evidence to decide either way

## STANDARDS

- Your reasoning must reference BOTH prosecution and defense
- If jury was split, you must acknowledge this
- If verdict is "guilty", you MUST provide specific actions
- Confidence score (0-1) must match strength of reasoning
- Low temperature = be consistent and predictable

## OUTPUT FORMAT

Return valid JSON matching this structure:

{
  "decision": "guilty" | "not_guilty" | "dismissed",
  "reasoning": "full analysis synthesizing all perspectives (200+ words)",
  "rationale": "one-sentence summary of verdict",
  "actions": ["specific action 1", "specific action 2"] // if guilty, otherwise null
  "confidence": 0.85 // 0-1 scale
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks.`;

  const message = await anthropic.messages.create({
    model: config.models.judge,
    max_tokens: 4096,
    temperature: config.parameters.judgeTemperature, // Low temperature for consistency
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Judge did not return text response");
  }

  // Parse JSON response
  const text = content.text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Judge did not return valid JSON: ${text}`);
  }

  const verdict = JSON.parse(jsonMatch[0]) as Verdict;

  // Validate
  validateVerdict(verdict);

  console.log(`   Decision: ${verdict.decision.toUpperCase()}`);
  console.log(`   Confidence: ${(verdict.confidence * 100).toFixed(0)}%`);

  return verdict;
}

function validateVerdict(verdict: Verdict): void {
  // Check decision is valid
  const validDecisions: Decision[] = ["guilty", "not_guilty", "dismissed"];
  if (!validDecisions.includes(verdict.decision)) {
    throw new Error(`Invalid decision: "${verdict.decision}"`);
  }

  // Check reasoning is substantial
  if (!verdict.reasoning || verdict.reasoning.length < 200) {
    throw new Error("Judge reasoning too brief (min 200 characters)");
  }

  // Check rationale exists
  if (!verdict.rationale || verdict.rationale.length < 20) {
    throw new Error("Judge rationale too brief (min 20 characters)");
  }

  // If guilty, must have actions
  if (verdict.decision === "guilty" && (!verdict.actions || verdict.actions.length === 0)) {
    throw new Error('Verdict "guilty" requires specific actions');
  }

  // Check confidence is in valid range
  if (
    typeof verdict.confidence !== "number" ||
    verdict.confidence < 0 ||
    verdict.confidence > 1
  ) {
    throw new Error(`Invalid confidence score: ${verdict.confidence}`);
  }
}
