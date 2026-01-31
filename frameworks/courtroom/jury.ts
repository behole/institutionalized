import Anthropic from "@anthropic-ai/sdk";
import type {
  Case,
  Prosecution,
  Defense,
  JurorDeliberation,
  JuryVerdict,
  CourtroomConfig,
  Vote,
} from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function deliberate(
  caseInput: Case,
  prosecution: Prosecution,
  defense: Defense,
  config: CourtroomConfig
): Promise<JuryVerdict> {
  console.log(`\n🏛️  Jury deliberating (${config.parameters.jurySize} jurors in parallel)...`);

  // Run all jurors in parallel
  const jurorPromises = Array.from(
    { length: config.parameters.jurySize },
    (_, i) => runJuror(i + 1, caseInput, prosecution, defense, config)
  );

  const jurors = await Promise.all(jurorPromises);

  // Tally votes
  let guiltyCount = 0;
  let notGuiltyCount = 0;
  let abstainCount = 0;

  for (const juror of jurors) {
    if (juror.vote === "guilty") guiltyCount++;
    else if (juror.vote === "not_guilty") notGuiltyCount++;
    else abstainCount++;
  }

  const proceedsToJudge = guiltyCount >= config.parameters.juryThreshold;

  console.log(`   Votes: ${guiltyCount} guilty, ${notGuiltyCount} not guilty, ${abstainCount} abstain`);
  console.log(`   ${proceedsToJudge ? "✅ Proceeds to judge" : "❌ Case dismissed"}`);

  return {
    jurors,
    guiltyCount,
    notGuiltyCount,
    abstainCount,
    proceedsToJudge,
  };
}

async function runJuror(
  jurorNumber: number,
  caseInput: Case,
  prosecution: Prosecution,
  defense: Defense,
  config: CourtroomConfig
): Promise<JurorDeliberation> {
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

  const prompt = `You are Juror ${jurorNumber} in a courtroom evaluation system. You must independently evaluate the case and cast a vote.

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

  const message = await anthropic.messages.create({
    model: config.models.jury,
    max_tokens: 2048,
    temperature: config.parameters.juryTemperature, // High temperature for variance
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error(`Juror ${jurorNumber} did not return text response`);
  }

  // Parse JSON response
  const text = content.text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(
      `Juror ${jurorNumber} did not return valid JSON: ${text}`
    );
  }

  const deliberation = JSON.parse(jsonMatch[0]) as JurorDeliberation;

  // Validate
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
