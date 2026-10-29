/**
 * Concrete pipelines. Each adapter maps the previous stage's result into the
 * next stage's typed input. Adapters narrow with explicit field access —
 * framework result shapes are stable contracts.
 */
import type { PipelineDefinition, StageAdapter } from './pipeline';

const PREMORTEM_TO_COURTROOM: StageAdapter = (prev, issue) => {
  const r = prev as {
    scenarios?: Array<{ scenario?: string; severity?: string; likelihood?: string }>;
    assessment?: {
      overallRiskLevel?: string;
      topRisks?: Array<{ scenario?: string }>;
      criticalAssumptions?: string[];
    };
  };
  const risks =
    r?.scenarios
      ?.slice(0, 5)
      .map((s) => `- ${s.scenario} (${s.severity ?? s.likelihood ?? 'severity n/a'})`) ??
    r?.assessment?.topRisks?.slice(0, 5).map((s) => `- ${s.scenario}`);
  const assumptions = r?.assessment?.criticalAssumptions?.slice(0, 3) ?? [];
  return {
    question: `Should the plan proceed: "${issue}"?`,
    context: [
      `The plan under debate: ${issue}`,
      'A pre-mortem analysis imagined this plan already failed. Findings:',
      ...(risks ?? []),
      ...(assumptions.length > 0
        ? ['Critical assumptions that would fail:', ...assumptions.map((a) => `- ${a}`)]
        : []),
      `Overall pre-mortem risk level: ${r?.assessment?.overallRiskLevel ?? 'unknown'}`,
    ],
  };
};

const COURTROOM_TO_AAR: StageAdapter = (prev, issue) => {
  const r = prev as {
    verdict?: { decision?: string; rationale?: string };
    jury?: {
      guiltyCount?: number;
      notGuiltyCount?: number;
      abstainCount?: number;
      proceedsToJudge?: boolean;
    };
    prosecution?: { arguments?: string[]; exhibits?: unknown[] };
    defense?: { counterArguments?: string[] };
  };
  const decision = r?.verdict?.decision;
  const rationale = r?.verdict?.rationale ?? '';
  return {
    content: [
      `Retrospective on an institutional deliberation.`,
      `Original issue: ${issue}`,
      `A courtroom-style review reached a verdict of "${decision ?? 'unknown'}": ${rationale.slice(0, 400)}`,
      r?.jury
        ? `Jury votes: ${r.jury.guiltyCount ?? 0} for concerns, ${r.jury.notGuiltyCount ?? 0} against, ${r.jury.abstainCount ?? 0} abstaining.`
        : '',
      `Review what worked and what didn't in this deliberation: were the right risks surfaced, was the process sound, what would you do differently next time?`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
};

const REDBLUE_TO_COURTROOM: StageAdapter = (prev, issue) => {
  const r = prev as {
    observerReport?: {
      overallAssessment?: string;
      verdict?: string;
      criticalVulnerabilities?: unknown[];
      prioritizedActions?: string[];
    };
    redAttacks?: Array<{ vulnerabilities?: Array<{ title?: string; severity?: string }> }>;
  };
  const vulns =
    r?.redAttacks
      ?.flatMap((a) => a.vulnerabilities ?? [])
      .slice(0, 5)
      .map((v) => `- ${v.title} (${v.severity})`) ?? [];
  return {
    question: `Given the red-team findings, is the system ready for deployment: "${issue}"?`,
    context: [
      'Red-team attack findings:',
      ...vulns,
      `Observer verdict: ${r?.observerReport?.verdict ?? 'unknown'}`,
      r?.observerReport?.overallAssessment
        ? `Assessment: ${r.observerReport.overallAssessment.slice(0, 300)}`
        : '',
    ].filter(Boolean),
  };
};

const PEERREVIEW_TO_COURTROOM: StageAdapter = (prev, issue) => {
  const r = prev as {
    decision?: { decision?: string; rationale?: string; requiredChanges?: string[] };
    reviews?: Array<{ reviewer?: string; weaknesses?: string[]; strengths?: string[] }>;
  };
  const weaknesses =
    r?.reviews?.flatMap((rev) => (rev.weaknesses ?? []).slice(0, 2)).slice(0, 5) ?? [];
  return {
    question: `Given the peer-review feedback, should this work be accepted for its purpose: "${issue}"?`,
    context: [
      `Peer-review decision: ${r?.decision?.decision ?? 'unknown'}`,
      r?.decision?.rationale ? `Editor rationale: ${r.decision.rationale.slice(0, 300)}` : '',
      ...(weaknesses.length > 0
        ? ['Key weaknesses raised:', ...weaknesses.map((w) => `- ${w}`)]
        : []),
    ],
  };
};

export const PIPELINES: PipelineDefinition[] = [
  {
    name: 'decision',
    label: 'Decision',
    description:
      'Single courtroom deliberation: adversarial prosecution, defense, jury vote, judge verdict.',
    keywords: ['merge', 'approve', 'ship', 'go/no-go', 'pr', 'pull-request'],
    stages: [
      {
        framework: 'courtroom',
        label: 'Courtroom',
        adapter: (_prev, issue) => ({
          question: issue,
          context: [
            `The full issue as stated by the decision-maker: ${issue}`,
            'Weigh evidence on both sides before verdict.',
          ],
        }),
        config: { parameters: { jurySize: 5, juryThreshold: 3 } },
      },
    ],
  },
  {
    name: 'plan-hardening',
    label: 'Plan hardening',
    description:
      'Pre-mortem finds failure modes → courtroom deliberates go/no-go → AAR retrospects the deliberation.',
    keywords: ['launch', 'plan', 'mitigate', 'risk', 'deadline', 'release', 'hire', 'budget'],
    stages: [
      {
        framework: 'pre-mortem',
        label: 'Pre-mortem',
        adapter: (_prev, issue) => ({
          description: issue,
          context: ['Imagine this plan failed. Surface the risks before deciding.'],
        }),
        config: { parameters: { numPessimists: 3 } },
      },
      {
        framework: 'courtroom',
        label: 'Courtroom',
        adapter: PREMORTEM_TO_COURTROOM,
        config: { parameters: { jurySize: 3, juryThreshold: 2 } },
      },
      {
        framework: 'aar',
        label: 'AAR',
        adapter: COURTROOM_TO_AAR,
        decisive: false,
      },
    ],
  },
  {
    name: 'security-review',
    label: 'Security review',
    description: 'Red team attacks in rounds → courtroom deliberates deploy/no-deploy.',
    keywords: [
      'security',
      'attack',
      'vulnerability',
      'auth',
      'deploy',
      'system',
      'infrastructure',
      'api',
    ],
    stages: [
      {
        framework: 'red-blue',
        label: 'Red/Blue',
        adapter: (_prev, issue) => ({
          system: issue,
          context: ['Stress-test this system before a deployment decision.'],
        }),
        config: { parameters: { rounds: 2 } },
      },
      {
        framework: 'courtroom',
        label: 'Courtroom',
        adapter: REDBLUE_TO_COURTROOM,
        config: { parameters: { jurySize: 3, juryThreshold: 2 } },
      },
    ],
  },
  {
    name: 'proposal-review',
    label: 'Proposal review',
    description: 'Peer review evaluates the document → courtroom deliberates accept/revise.',
    keywords: ['review', 'paper', 'proposal', 'document', 'rfc', 'draft', 'essay', 'design doc'],
    stages: [
      {
        framework: 'peer-review',
        label: 'Peer review',
        adapter: (_prev, issue) => ({ work: issue, reviewType: 'technical' }),
        config: { parameters: { numReviewers: 3, enableRebuttal: false } },
      },
      {
        framework: 'courtroom',
        label: 'Courtroom',
        adapter: PEERREVIEW_TO_COURTROOM,
        config: { parameters: { jurySize: 3, juryThreshold: 2 } },
      },
    ],
  },
];

/** Keyword routing: suggest a pipeline for an issue. More matches win; ties break by longest matching keyword (specificity). */
export function routePipeline(issue: string): PipelineDefinition {
  const lower = issue.toLowerCase();
  let best = PIPELINES[0];
  let bestScore = 0;
  let bestSpecificity = 0;
  for (const p of PIPELINES) {
    const matched = p.keywords.filter((k) => lower.includes(k));
    const score = matched.length;
    const specificity = matched.length > 0 ? Math.max(...matched.map((k) => k.length)) : 0;
    if (score > bestScore || (score === bestScore && specificity > bestSpecificity)) {
      best = p;
      bestScore = score;
      bestSpecificity = specificity;
    }
  }
  return best;
}

export function getPipeline(name: string): PipelineDefinition | undefined {
  return PIPELINES.find((p) => p.name === name);
}
