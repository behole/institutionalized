import type { DissertationWork, DissertationCommitteeConfig, CommitteeMember, StageReview } from "./types";
import { generateObject } from "@institutional-reasoning/core";

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

export async function conductReview(
  work: DissertationWork,
  member: CommitteeMember,
  config: DissertationCommitteeConfig
): Promise<StageReview> {
  const modelKey = member.role === "advisor" ? "advisor" :
                   member.role === "methodologist" ? "methodologist" :
                   member.role === "specialist" ? `specialist${Math.floor(Math.random() * 2) + 1}` :
                   "advisor";
  const model = config.models[modelKey as keyof typeof config.models];
  
  const systemPrompt = `You are a ${member.role} on a dissertation committee specializing in ${member.specialty}.
Your role is to conduct a rigorous academic review of the work at the ${work.stage} stage.

Provide:
1. Assessment of strengths (what works well)
2. Assessment of weaknesses (what needs improvement)
3. Critical questions that need addressing
4. A clear verdict: approve, revise, or reject
5. Required changes if revise/reject
6. Suggestions for improvement

Be thorough, fair, and constructive. This is a ${work.stage} stage review.`;

  const userPrompt = `DISSERTATION WORK:
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

  try {
    return await generateObject<StageReview>({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: config.parameters.temperature,
    });
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
