import type { DissertationWork, DissertationCommitteeConfig, CommitteeMember, StageReview } from "./types";
import { parseJSON } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";

export function formCommittee(work: DissertationWork, config: DissertationCommitteeConfig): CommitteeMember[] {
  const committee: CommitteeMember[] = [
    {
      name: "Primary Advisor",
      specialty: work.field,
      role: "advisor",
    },
    {
      name: "Specialist 1",
      specialty: `${work.field} - Theoretical Foundations`,
      role: "specialist",
    },
    {
      name: "Specialist 2",
      specialty: `${work.field} - Applied Research`,
      role: "specialist",
    },
    {
      name: "Methodologist",
      specialty: "Research Methodology",
      role: "methodologist",
    },
  ];

  return committee.slice(0, config.parameters.committeeSize);
}

export function buildReviewPrompt(
  work: DissertationWork,
  member: CommitteeMember,
  config: DissertationCommitteeConfig
): { system: string; user: string } {
  const system = `You are a ${member.role} on a dissertation committee specializing in ${member.specialty}.
Your role is to conduct a rigorous academic review of the work at the ${work.stage} stage.

Provide:
1. Assessment of strengths (what works well)
2. Assessment of weaknesses (what needs improvement)
3. Critical questions that need addressing
4. A clear verdict: approve, revise, or reject
5. Required changes if revise/reject
6. Suggestions for improvement

Be thorough, fair, and constructive. This is a ${work.stage} stage review.

Respond with valid JSON matching this structure:
{
  "stage": "string",
  "reviewer": "string",
  "assessment": {
    "strengths": ["string"],
    "weaknesses": ["string"],
    "questions": ["string"]
  },
  "verdict": "approve" | "revise" | "reject",
  "requiredChanges": ["string"],
  "suggestions": ["string"]
}`;

  const user = `DISSERTATION WORK:
Title: ${work.title}
Field: ${work.field}
Stage: ${work.stage}

ABSTRACT:
${work.abstract}

${work.methodology ? `METHODOLOGY:\n${work.methodology}\n` : ""}
${work.contributions ? `CONTRIBUTIONS:\n${work.contributions.join("\n")}\n` : ""}

CONTENT (excerpt):
${work.content.substring(0, 8000)}${work.content.length > 8000 ? "\n... [truncated]" : ""}

As the ${member.name} (${member.role}), provide your stage review including:
1. Strengths of the work
2. Weaknesses or concerns
3. Critical questions
4. Your verdict (approve/revise/reject)
5. Required changes (if any)
6. Suggestions for improvement`;

  return { system, user };
}

export function parseReviewResponse(text: string, work: DissertationWork, member: CommitteeMember): StageReview {
  try {
    return parseJSON<StageReview>(text);
  } catch {
    return {
      stage: work.stage,
      reviewer: member.name,
      assessment: {
        strengths: ["Work received for review"],
        weaknesses: ["Complete review pending"],
        questions: ["Please resubmit for full review"],
      },
      verdict: "revise",
      requiredChanges: ["Address all committee feedback"],
      suggestions: ["Provide more complete work sample"],
    };
  }
}

export async function conductReview(
  work: DissertationWork,
  member: CommitteeMember,
  config: DissertationCommitteeConfig,
  provider: LLMProvider
): Promise<StageReview> {
  const modelKey = member.role === "advisor" ? "advisor" :
                   member.role === "methodologist" ? "methodologist" :
                   member.role === "specialist" ? `specialist${Math.floor(Math.random() * 2) + 1}` :
                   "advisor";
  const model = config.models[modelKey as keyof typeof config.models];
  const { system, user } = buildReviewPrompt(work, member, config);

  try {
    const response = await provider.call({
      model,
      messages: [{ role: "user", content: user }],
      temperature: config.parameters.temperature,
      systemPrompt: system,
      maxTokens: 4096,
    });
    return parseReviewResponse(response.content, work, member);
  } catch (error) {
    console.warn(`Review failed for ${member.name}:`, error);
    return {
      stage: work.stage,
      reviewer: member.name,
      assessment: {
        strengths: ["Work received for review"],
        weaknesses: ["Complete review pending"],
        questions: ["Please resubmit for full review"],
      },
      verdict: "revise",
      requiredChanges: ["Address all committee feedback"],
      suggestions: ["Provide more complete work sample"],
    };
  }
}
