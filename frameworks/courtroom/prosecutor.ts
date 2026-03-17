import type { LLMProvider } from "@core/types";
import { parseJSON } from "@core/orchestrator";
import type { Case, Prosecution, Exhibit, CourtroomConfig } from "./types";

export function buildProsecutionPrompt(
  caseInput: Case,
  _config: CourtroomConfig
): string {
  const contextContent = caseInput.context.join("\n\n---\n\n");

  return `You are a prosecutor in a courtroom evaluation system. Your role is to build a case for why the answer to this question should be "GUILTY" (meaning: take action, proceed, accept).

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
}

export function parseProsecutionResponse(
  text: string,
  contextContent: string,
  config: CourtroomConfig
): Prosecution {
  const prosecution = parseJSON<Prosecution>(text);
  validateExhibits(prosecution.exhibits, contextContent, config);
  return prosecution;
}

export async function prosecute(
  caseInput: Case,
  config: CourtroomConfig,
  provider: LLMProvider
): Promise<Prosecution> {
  const contextContent = caseInput.context.join("\n\n---\n\n");
  const prompt = buildProsecutionPrompt(caseInput, config);

  const response = await provider.call({
    model: config.models.prosecutor,
    maxTokens: 4096,
    temperature: 0.7,
    messages: [{ role: "user", content: prompt }],
  });

  return parseProsecutionResponse(response.content, contextContent, config);
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
