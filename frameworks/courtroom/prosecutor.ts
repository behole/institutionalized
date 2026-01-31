import Anthropic from "@anthropic-ai/sdk";
import type { Case, Prosecution, Exhibit, CourtroomConfig } from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function prosecute(
  caseInput: Case,
  config: CourtroomConfig
): Promise<Prosecution> {
  const contextContent = caseInput.context.join("\n\n---\n\n");

  const prompt = `You are a prosecutor in a courtroom evaluation system. Your role is to build a case for why the answer to this question should be "GUILTY" (meaning: take action, proceed, accept).

## THE QUESTION
${caseInput.question}

## CONTEXT MATERIALS
${contextContent}

## YOUR TASK

Build a prosecution case with the following structure:

1. **CASE STATEMENT** - Your opening argument for why the answer should be "guilty" (proceed/accept/take action)

2. **EXHIBITS** - Evidence supporting your case. Each exhibit MUST have:
   - **Source Quote**: An EXACT quote from the context materials (verbatim, no paraphrasing)
   - **Target Quote**: What this relates to or what needs to happen
   - **Concrete Harm**: Specific consequence if we vote "not guilty" - NOT vague ("might confuse users") but SPECIFIC ("support team will tell customers feature X works when it's now deprecated")

3. **HARM ANALYSIS** - Overall analysis of what happens if we don't take action

## LEGAL STANDARDS

- Quotes must be EXACT (will be programmatically verified)
- Harm must be SPECIFIC and CONCRETE
- You're building a burden of proof
- Use legal terminology naturally (exhibit, evidence, burden of proof)

## OUTPUT FORMAT

Return valid JSON matching this structure:

{
  "caseStatement": "...",
  "exhibits": [
    {
      "sourceQuote": "exact text from context",
      "targetQuote": "what this relates to",
      "harm": "specific consequence"
    }
  ],
  "harmAnalysis": "overall harm if not guilty"
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks.`;

  const message = await anthropic.messages.create({
    model: config.models.prosecutor,
    max_tokens: 4096,
    temperature: 0.7,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Expected text response from prosecutor");
  }

  // Parse JSON response
  const text = content.text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Prosecutor did not return valid JSON: ${text}`);
  }

  const prosecution = JSON.parse(jsonMatch[0]) as Prosecution;

  // Validate exhibits
  validateExhibits(prosecution.exhibits, contextContent, config);

  return prosecution;
}

function validateExhibits(
  exhibits: Exhibit[],
  context: string,
  config: CourtroomConfig
): void {
  for (let i = 0; i < exhibits.length; i++) {
    const exhibit = exhibits[i];

    // Check source quote exists in context
    if (config.validation.requireExactQuotes) {
      if (!context.includes(exhibit.sourceQuote)) {
        throw new Error(
          `Exhibit ${i + 1}: Source quote not found in context: "${exhibit.sourceQuote.substring(0, 100)}..."`
        );
      }
    }

    // Check harm is substantial
    const harmWords = exhibit.harm.split(/\s+/).length;
    if (harmWords < config.validation.minHarmWords) {
      throw new Error(
        `Exhibit ${i + 1}: Harm statement too vague (${harmWords} words, min ${config.validation.minHarmWords})`
      );
    }
  }
}
