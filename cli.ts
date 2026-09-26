#!/usr/bin/env bun
/**
 * Unified CLI for Institutional Reasoning frameworks
 *
 * Usage:
 *   institutional-reasoning <framework> <input-file> [options]
 *   institutional-reasoning --list
 *   institutional-reasoning --interactive
 *
 * Examples:
 *   institutional-reasoning courtroom case.json --verbose
 *   institutional-reasoning peer-review paper.md --reviewers 3
 *   institutional-reasoning --list
 *   institutional-reasoning --interactive
 */

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { prettyReporter } from './core/engine/reporters';
import type { EventSink } from './core/engine/events';

// Framework metadata for --list and interactive mode
interface FrameworkMetadata {
  description: string;
  tier: string;
  category: string;
  purpose: string;
  agents: string[];
  agentCount: number;
  complexity: 'Simple' | 'Medium' | 'Advanced';
  bestFor: string;
  exampleUseCases: string[];
  typicalTime: string;
  output: string;
}

const FRAMEWORKS: Record<string, FrameworkMetadata> = {
  // Tier 1 - MVP
  courtroom: {
    description: 'Adversarial evaluation for binary decisions',
    tier: 'MVP',
    category: 'Decision',
    purpose: 'Determine guilt/innocence through adversarial debate',
    agents: ['Prosecutor', 'Defense', 'Jury (5)', 'Judge'],
    agentCount: 8,
    complexity: 'Medium',
    bestFor: 'High-stakes yes/no decisions under uncertainty',
    exampleUseCases: [
      'Should we merge this PR?',
      'Should we launch this feature?',
      'Should we invest in this startup?',
    ],
    typicalTime: '3-5 minutes',
    output: 'Verdict (guilty/not guilty/dismissed) + reasoning from all parties',
  },
  'peer-review': {
    description: 'Academic-style validation with author rebuttal',
    tier: 'MVP',
    category: 'Review',
    purpose: 'Validate documents through reviewer feedback and author rebuttal',
    agents: ['Reviewer 1', 'Reviewer 2', 'Reviewer 3', 'Author', 'Editor'],
    agentCount: 5,
    complexity: 'Medium',
    bestFor: 'Validating technical documents, research papers, and specifications',
    exampleUseCases: [
      'Review this technical specification',
      'Validate this research proposal',
      'Evaluate this academic paper',
    ],
    typicalTime: '5-8 minutes',
    output: 'Accept/Revise/Reject decision + consolidated feedback',
  },
  'red-blue': {
    description: 'Military stress-testing for security and architecture',
    tier: 'MVP',
    category: 'Security',
    purpose: 'Test defenses through adversarial attack simulation',
    agents: ['Blue (Defender)', 'Red (Attacker)', 'Observer'],
    agentCount: 3,
    complexity: 'Advanced',
    bestFor: 'Security testing, architecture validation, finding edge cases',
    exampleUseCases: [
      'Test our system architecture for vulnerabilities',
      'Stress-test our security posture',
      'Find edge cases in our API design',
    ],
    typicalTime: '5-10 minutes',
    output: 'Vulnerabilities found + severity ratings + mitigation strategies',
  },
  'pre-mortem': {
    description: 'Identify failure modes before committing',
    tier: 'MVP',
    category: 'Risk',
    purpose: 'Proactively identify and mitigate potential failures',
    agents: [
      'Pessimist 1',
      'Pessimist 2',
      'Pessimist 3',
      'Pessimist 4',
      'Pessimist 5',
      'Facilitator',
    ],
    agentCount: 6,
    complexity: 'Medium',
    bestFor: 'Launch decisions, strategic planning, project kickoffs',
    exampleUseCases: [
      'What could go wrong with our product launch?',
      'Identify risks in our Q4 strategy',
      'Review potential failure modes for this project',
    ],
    typicalTime: '4-7 minutes',
    output: 'Ranked failure scenarios + likelihood ratings + mitigation strategies',
  },
  studio: {
    description: 'Creative work evaluation with peer feedback',
    tier: 'MVP',
    category: 'Creative',
    purpose: 'Provide constructive feedback on creative and design work',
    agents: ['Peer 1', 'Peer 2', 'Peer 3', 'Creator', 'Instructor'],
    agentCount: 5,
    complexity: 'Medium',
    bestFor: 'Creative work review, design critiques, essay feedback',
    exampleUseCases: [
      'Review this design mockup',
      'Provide feedback on this essay',
      'Evaluate this creative project',
    ],
    typicalTime: '4-6 minutes',
    output: "What works + What doesn't + Questions + Suggestions",
  },
  // Tier 2 - High Demand
  'devils-advocate': {
    description: 'Formal challenge to proposals',
    tier: 'High Demand',
    category: 'Challenge',
    purpose: 'Systematically challenge assumptions and find weaknesses',
    agents: ['Advocate (Opposition)', 'Proponent', 'Arbiter'],
    agentCount: 3,
    complexity: 'Simple',
    bestFor: 'Testing proposals, challenging assumptions, stress-testing ideas',
    exampleUseCases: [
      'Challenge our new feature proposal',
      'Find weaknesses in our strategy',
      'Test our assumptions about this approach',
    ],
    typicalTime: '3-5 minutes',
    output: 'List of concerns + strengths + recommendations',
  },
  aar: {
    description: 'Blameless learning from execution',
    tier: 'High Demand',
    category: 'Retrospective',
    purpose: 'Extract lessons learned from completed projects or events',
    agents: ['Facilitator', 'Participant 1', 'Participant 2', 'Participant 3', 'Observer'],
    agentCount: 5,
    complexity: 'Medium',
    bestFor: 'Post-mortems, project retrospectives, incident analysis',
    exampleUseCases: [
      'What went wrong with our last deployment?',
      'Extract lessons from our failed experiment',
      'Analyze our incident response',
    ],
    typicalTime: '5-8 minutes',
    output: 'What happened + Why it happened + Lessons learned + Action items',
  },
  'six-hats': {
    description: 'Multi-perspective analysis',
    tier: 'High Demand',
    category: 'Analysis',
    purpose: 'Examine a problem from six different cognitive perspectives',
    agents: [
      'White Hat (Facts)',
      'Red Hat (Emotions)',
      'Black Hat (Risks)',
      'Yellow Hat (Optimism)',
      'Green Hat (Creativity)',
      'Blue Hat (Control)',
    ],
    agentCount: 6,
    complexity: 'Medium',
    bestFor: 'Multi-faceted decision making, strategic thinking, complex analysis',
    exampleUseCases: [
      'Analyze our market entry strategy',
      'Evaluate this investment decision',
      'Assess our product roadmap',
    ],
    typicalTime: '4-6 minutes',
    output: 'Synthesis of six perspectives + recommended approach',
  },
  'phd-defense': {
    description: 'Rigorous proposal validation',
    tier: 'High Demand',
    category: 'Validation',
    purpose: 'Deep technical validation through expert committee examination',
    agents: [
      'Candidate',
      'Committee Member 1',
      'Committee Member 2',
      'Committee Member 3',
      'Committee Member 4',
      'Chair',
    ],
    agentCount: 6,
    complexity: 'Advanced',
    bestFor: 'Complex technical proposals, system design validation, research direction approval',
    exampleUseCases: [
      'Validate our new architecture proposal',
      'Evaluate this complex technical decision',
      'Review our research methodology',
    ],
    typicalTime: '6-10 minutes',
    output: 'Pass/Revisions/Fail decision + detailed technical feedback',
  },
  'architecture-review': {
    description: 'System design validation',
    tier: 'High Demand',
    category: 'Design',
    purpose: 'Validate system design across multiple technical domains',
    agents: [
      'Performance Expert',
      'Security Expert',
      'Scalability Expert',
      'Cost Expert',
      'Maintainability Expert',
      'Chair',
    ],
    agentCount: 6,
    complexity: 'Advanced',
    bestFor: 'System architecture review, technical design validation, infrastructure planning',
    exampleUseCases: [
      'Review our new microservices architecture',
      'Validate our database design',
      'Assess our system scalability',
    ],
    typicalTime: '6-10 minutes',
    output: 'Approval status + domain-specific concerns + recommendations',
  },
  // Tier 3 - Specialized
  'grant-panel': {
    description: 'Comparative prioritization under constraints',
    tier: 'Specialized',
    category: 'Prioritization',
    purpose: 'Select and prioritize proposals under budget and resource constraints',
    agents: ['Panel Member 1', 'Panel Member 2', 'Panel Member 3', 'Panel Member 4', 'Chair'],
    agentCount: 5,
    complexity: 'Advanced',
    bestFor: 'Budget allocation, grant selection, project prioritization',
    exampleUseCases: [
      'Select which projects to fund from our portfolio',
      'Prioritize features for our next sprint',
      'Allocate budget across competing initiatives',
    ],
    typicalTime: '7-12 minutes',
    output: 'Ranked priorities + funding allocations + rationale',
  },
  'intelligence-analysis': {
    description: 'Diagnostic reasoning via competing hypotheses',
    tier: 'Specialized',
    category: 'Intelligence',
    purpose: 'Diagnose complex situations using structured analytical techniques',
    agents: ['Analyst 1', 'Analyst 2', 'Analyst 3', 'Analyst 4', 'Chief Analyst'],
    agentCount: 5,
    complexity: 'Advanced',
    bestFor: 'Diagnostic reasoning, complex problem solving, hypothesis testing',
    exampleUseCases: [
      'Diagnose why our user growth stalled',
      'Analyze competing explanations for a problem',
      'Test hypotheses about market dynamics',
    ],
    typicalTime: '6-10 minutes',
    output: 'Most likely explanation + competing hypotheses analysis + confidence levels',
  },
  delphi: {
    description: 'Expert consensus building',
    tier: 'Specialized',
    category: 'Consensus',
    purpose: 'Build consensus through anonymous iterative expert input',
    agents: ['Expert 1', 'Expert 2', 'Expert 3', 'Expert 4', 'Expert 5', 'Facilitator'],
    agentCount: 6,
    complexity: 'Medium',
    bestFor: 'Expert consensus, anonymous feedback, iterative refinement',
    exampleUseCases: [
      'Get anonymous expert input on our strategy',
      'Build consensus on a controversial decision',
      'Refine our approach through iterative feedback',
    ],
    typicalTime: '8-15 minutes (multiple rounds)',
    output: 'Consensus position + areas of agreement/disagreement',
  },
  'design-critique': {
    description: 'Structured design feedback',
    tier: 'Specialized',
    category: 'Design',
    purpose: 'Provide structured, actionable feedback on design work',
    agents: ['Peer 1', 'Peer 2', 'Stakeholder 1', 'Stakeholder 2', 'Facilitator'],
    agentCount: 5,
    complexity: 'Medium',
    bestFor: 'Design review, UX evaluation, interface critique',
    exampleUseCases: [
      'Review our new UI design',
      'Evaluate this user experience flow',
      'Critique our visual design system',
    ],
    typicalTime: '5-8 minutes',
    output: 'Design feedback + actionable improvements + prioritized suggestions',
  },
  'consensus-circle': {
    description: 'Quaker-style consensus without voting',
    tier: 'Specialized',
    category: 'Consensus',
    purpose: 'Achieve unity without voting through concern-based discussion',
    agents: [
      'Participant 1',
      'Participant 2',
      'Participant 3',
      'Participant 4',
      'Participant 5',
      'Facilitator',
    ],
    agentCount: 6,
    complexity: 'Medium',
    bestFor: 'Group decision making, conflict resolution, unity building',
    exampleUseCases: [
      'Make a decision as a team without voting',
      'Resolve a disagreement among stakeholders',
      'Build unity around a controversial proposal',
    ],
    typicalTime: '6-12 minutes',
    output: 'Decision status (consensus/stand-aside/block) + list of concerns',
  },
  // Tier 4 - Advanced
  'differential-diagnosis': {
    description: 'Systematic diagnostic reasoning',
    tier: 'Advanced',
    category: 'Diagnosis',
    purpose: 'Systematically narrow down possible explanations through elimination',
    agents: ['Chief Diagnostician', 'Specialist 1', 'Specialist 2', 'Specialist 3', 'Specialist 4'],
    agentCount: 5,
    complexity: 'Advanced',
    bestFor: 'Troubleshooting, root cause analysis, medical-style diagnosis',
    exampleUseCases: [
      'Diagnose our production outage',
      'Find the root cause of this performance issue',
      'Systematically troubleshoot this complex problem',
    ],
    typicalTime: '5-10 minutes',
    output: 'Differential diagnosis + most likely cause + recommended tests',
  },
  socratic: {
    description: 'Assumption testing through questioning',
    tier: 'Advanced',
    category: 'Philosophy',
    purpose: 'Expose gaps and test assumptions through probing questions',
    agents: ['Socrates (Questioner)', 'Student 1', 'Student 2', 'Observer'],
    agentCount: 4,
    complexity: 'Simple',
    bestFor: 'Assumption testing, critical thinking, exposing gaps in reasoning',
    exampleUseCases: [
      'Test our assumptions about this approach',
      'Expose gaps in our reasoning',
      'Challenge the foundation of our argument',
    ],
    typicalTime: '4-7 minutes',
    output: 'List of exposed assumptions + unanswered questions + areas for improvement',
  },
  swot: {
    description: 'Strategic situational assessment',
    tier: 'Advanced',
    category: 'Strategy',
    purpose: 'Assess strengths, weaknesses, opportunities, and threats',
    agents: [
      'Strengths Analyst',
      'Weaknesses Analyst',
      'Opportunities Analyst',
      'Threats Analyst',
      'Synthesizer',
    ],
    agentCount: 5,
    complexity: 'Medium',
    bestFor: 'Strategic planning, situational analysis, competitive assessment',
    exampleUseCases: [
      'Analyze our market position',
      'Assess our competitive landscape',
      'Evaluate our strategic options',
    ],
    typicalTime: '4-6 minutes',
    output: 'SWOT matrix + strategic recommendations',
  },
  'tumor-board': {
    description: 'Multi-specialist consensus for complex decisions',
    tier: 'Advanced',
    category: 'Medical',
    purpose: 'Bring multiple specialties together for complex diagnostic decisions',
    agents: ['Oncologist', 'Radiologist', 'Surgeon', 'Pathologist', 'Nurse Navigator', 'Chair'],
    agentCount: 6,
    complexity: 'Advanced',
    bestFor: 'Multi-disciplinary decisions, complex diagnoses, treatment planning',
    exampleUseCases: [
      'Make a complex technical decision with multiple stakeholders',
      'Plan treatment for a complex system problem',
      'Coordinate across specialists for a difficult diagnosis',
    ],
    typicalTime: '6-10 minutes',
    output: 'Consensus diagnosis + treatment plan + risk assessment',
  },
  parliamentary: {
    description: 'Adversarial policy discussion',
    tier: 'Advanced',
    category: 'Debate',
    purpose: 'Formal debate with structured argumentation and voting',
    agents: ['Government', 'Opposition', 'Speaker', 'Clerk', 'Observer'],
    agentCount: 5,
    complexity: 'Advanced',
    bestFor: 'Policy decisions, formal debates, adversarial discussion',
    exampleUseCases: [
      'Debate our new policy proposal',
      'Discuss a controversial decision',
      'Formulate adversarial policy',
    ],
    typicalTime: '7-12 minutes',
    output: 'Debate transcript + vote results + policy recommendations',
  },
  // Tier 5 - Research
  'war-gaming': {
    description: 'Military scenario testing for strategic planning',
    tier: 'Research',
    category: 'Strategy',
    purpose: 'Test strategic plans through simulated adversarial scenarios',
    agents: ['Blue Team (Friendly)', 'Red Team (Opposition)', 'Control Team', 'Observer'],
    agentCount: 4,
    complexity: 'Advanced',
    bestFor: 'Strategic planning, market entry, competitive scenarios',
    exampleUseCases: [
      'Test our market entry strategy against competitors',
      'Simulate how our product launch will fare',
      'Game out strategic scenarios with competitors',
    ],
    typicalTime: '8-15 minutes',
    output: 'Scenario outcomes + winning strategies + lessons learned',
  },
  'writers-workshop': {
    description: 'Manuscript feedback in Clarion style',
    tier: 'Research',
    category: 'Creative',
    purpose: 'Provide detailed, constructive feedback on manuscripts and long-form writing',
    agents: ['Writer', 'Critiquer 1', 'Critiquer 2', 'Critiquer 3', 'Moderator'],
    agentCount: 5,
    complexity: 'Medium',
    bestFor: 'Manuscript review, novel feedback, long-form content critique',
    exampleUseCases: [
      'Get feedback on my novel manuscript',
      'Review this long-form essay',
      'Critique this extensive documentation',
    ],
    typicalTime: '8-15 minutes',
    output: 'Detailed critique + line edits + structural suggestions + encouragement',
  },
  'regulatory-impact': {
    description: 'Comprehensive policy impact assessment',
    tier: 'Research',
    category: 'Compliance',
    purpose: 'Assess the impact of proposed regulations or policies',
    agents: [
      'Legal Expert',
      'Economic Analyst',
      'Social Impact Analyst',
      'Industry Representative',
      'Chair',
    ],
    agentCount: 5,
    complexity: 'Advanced',
    bestFor: 'Policy analysis, regulatory compliance, impact assessment',
    exampleUseCases: [
      'Assess the impact of a new regulation on our business',
      'Evaluate the consequences of a policy change',
      'Analyze regulatory compliance requirements',
    ],
    typicalTime: '7-12 minutes',
    output: 'Impact assessment + compliance requirements + risk analysis + recommendations',
  },
  hegelian: {
    description: 'Thesis-antithesis-synthesis dialectic',
    tier: 'Research',
    category: 'Philosophy',
    purpose: 'Resolve contradictions through dialectical reasoning',
    agents: ['Thesis', 'Antithesis', 'Synthesis', 'Moderator'],
    agentCount: 4,
    complexity: 'Advanced',
    bestFor: 'Resolving contradictions, philosophical reasoning, synthesis of opposing views',
    exampleUseCases: [
      'Resolve the tension between two competing approaches',
      'Synthesize opposing viewpoints into a unified approach',
      'Use dialectical reasoning to resolve a contradiction',
    ],
    typicalTime: '5-8 minutes',
    output: 'Thesis-antithesis synthesis + resolved position + reasoning chain',
  },
  talmudic: {
    description: 'Multi-interpretation textual analysis',
    tier: 'Research',
    category: 'Analysis',
    purpose: 'Explore multiple interpretations of texts or data through structured debate',
    agents: ['Interpreter 1', 'Interpreter 2', 'Interpreter 3', 'Interpreter 4', 'Moderator'],
    agentCount: 5,
    complexity: 'Advanced',
    bestFor: 'Textual analysis, legal interpretation, multi-stakeholder understanding',
    exampleUseCases: [
      'Analyze this contract from multiple perspectives',
      'Interpret this complex specification',
      'Explore multiple understandings of this data',
    ],
    typicalTime: '6-10 minutes',
    output: 'Multiple interpretations + areas of agreement/disagreement + synthesis',
  },
  'dissertation-committee': {
    description: 'Multi-stage academic work validation',
    tier: 'Research',
    category: 'Academic',
    purpose: 'Validate academic work through multi-stage committee review',
    agents: [
      'Advisor',
      'Committee Member 1',
      'Committee Member 2',
      'Committee Member 3',
      'Committee Member 4',
    ],
    agentCount: 5,
    complexity: 'Advanced',
    bestFor: 'Thesis validation, dissertation review, multi-stage academic assessment',
    exampleUseCases: [
      'Review this dissertation chapter by chapter',
      'Validate a thesis through multi-stage committee review',
      'Assess academic work across multiple dimensions',
    ],
    typicalTime: '10-20 minutes',
    output: 'Stage-by-stage approval + consolidated feedback + final recommendation',
  },
} as const;

type FrameworkName = keyof typeof FRAMEWORKS;

const FRAMEWORK_NAMES = Object.keys(FRAMEWORKS);

// Auto-detection patterns: map file patterns to frameworks
const AUTO_DETECT_PATTERNS: Record<string, FrameworkName> = {
  courtroom: 'courtroom',
  case: 'courtroom',
  merge: 'courtroom',
  pr: 'courtroom',
  'pull-request': 'courtroom',
  'peer-review': 'peer-review',
  paper: 'peer-review',
  manuscript: 'peer-review',
  'red-blue': 'red-blue',
  security: 'red-blue',
  architecture: 'architecture-review',
  'pre-mortem': 'pre-mortem',
  launch: 'pre-mortem',
  risk: 'pre-mortem',
  studio: 'studio',
  creative: 'studio',
  design: 'design-critique',
  'six-hats': 'six-hats',
  decision: 'six-hats',
  phd: 'phd-defense',
  dissertation: 'dissertation-committee',
  grant: 'grant-panel',
  intelligence: 'intelligence-analysis',
  delphi: 'delphi',
  consensus: 'consensus-circle',
  diagnosis: 'differential-diagnosis',
  socratic: 'socratic',
  swot: 'swot',
  tumor: 'tumor-board',
  medical: 'tumor-board',
  parliamentary: 'parliamentary',
  war: 'war-gaming',
  writers: 'writers-workshop',
  regulatory: 'regulatory-impact',
  hegelian: 'hegelian',
  talmudic: 'talmudic',
  aar: 'aar',
  'after-action': 'aar',
  'post-mortem': 'aar',
  'devils-advocate': 'devils-advocate',
  advocate: 'devils-advocate',
} as const;

interface Flags {
  [key: string]: any;
  verbose?: boolean;
  output?: string;
  config?: string;
  'dry-run'?: boolean;
  help?: boolean;
  version?: boolean;
  list?: boolean;
  interactive?: boolean;
  which?: boolean;
  recommend?: boolean;
}

async function main() {
  const args = process.argv.slice(2);

  // Parse flags first to handle global options
  const flags = parseFlags(args);

  // Handle help
  if (flags.help || (args.length === 0 && !flags.list && !flags.interactive && !flags.version)) {
    await showHelp();
    process.exit(0);
  }

  // Handle version
  if (flags.version) {
    const pkg = await import('./package.json', { with: { type: 'json' } });
    console.log(`institutional-reasoning v${pkg.default.version}`);
    process.exit(0);
  }

  // Handle list
  if (flags.list) {
    listFrameworks();
    process.exit(0);
  }

  // Handle interactive mode
  if (flags.interactive) {
    await interactiveMode();
    process.exit(0);
  }

  // Handle which/recommend
  if (flags.which || flags.recommend) {
    await recommendFramework();
    process.exit(0);
  }

  // Handle framework execution
  let framework: FrameworkName | undefined;
  let inputFile: string | undefined;

  // If no positional args, show help
  const positionalArgs = args.filter((a) => !a.startsWith('-'));

  if (positionalArgs.length === 0) {
    await showHelp();
    process.exit(1);
  }

  // First positional arg: could be framework or input file
  if (positionalArgs.length >= 1) {
    const firstArg = positionalArgs[0];

    // Check if it's a known framework
    if (FRAMEWORK_NAMES.includes(firstArg)) {
      framework = firstArg;
      inputFile = positionalArgs[1];
    } else {
      // Could be an input file - try to auto-detect framework
      inputFile = firstArg;
      framework = await detectFrameworkFromFile(inputFile);
    }
  }

  // If still no framework, try to get from second arg
  if (!framework && positionalArgs.length >= 2) {
    const secondArg = positionalArgs[1];
    if (FRAMEWORK_NAMES.includes(secondArg)) {
      framework = secondArg;
      inputFile = positionalArgs[0];
    }
  }

  // Validate we have both
  if (!framework) {
    console.error(`❌ Could not determine framework.\n`);
    console.error(`   Specify explicitly: institutional-reasoning <framework> <file>`);
    console.error(`   Or use: institutional-reasoning --list`);
    process.exit(1);
  }

  if (!inputFile) {
    console.error(`❌ No input file specified.\n`);
    console.error(`   Usage: institutional-reasoning ${framework} <input-file> [options]`);
    process.exit(1);
  }

  try {
    await runFramework(framework, inputFile, flags);
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    if (flags.verbose && error instanceof Error) {
      console.error(`\nStack trace:\n${error.stack}`);
    }
    process.exit(2);
  }
}

async function detectFrameworkFromFile(filepath: string): Promise<FrameworkName | undefined> {
  const filename = filepath.toLowerCase();

  // Try to detect from directory structure first
  // e.g., examples/courtroom/merge-pr.json -> courtroom
  const parts = filepath.split('/');
  for (const part of parts) {
    const normalized = part.toLowerCase().replace(/[^a-z0-9-]/g, '');
    for (const [pattern, framework] of Object.entries(AUTO_DETECT_PATTERNS)) {
      if (normalized.includes(pattern.toLowerCase().replace(/[^a-z0-9-]/g, ''))) {
        return framework;
      }
    }
  }

  // Try to match by filename pattern
  for (const [pattern, framework] of Object.entries(AUTO_DETECT_PATTERNS)) {
    if (filename.includes(pattern.toLowerCase())) {
      return framework;
    }
  }

  // Try to detect from file content
  try {
    const resolvedPath = filepath.startsWith('/') ? filepath : resolve(process.cwd(), filepath);
    const content = await readFile(resolvedPath, 'utf8').catch(() => '');
    if (content) {
      const lowerContent = content.toLowerCase();
      for (const [pattern, framework] of Object.entries(AUTO_DETECT_PATTERNS)) {
        if (lowerContent.includes(pattern.toLowerCase())) {
          return framework;
        }
      }
    }
  } catch {
    // Ignore read errors
  }

  return undefined;
}

// Static framework registry: engine-ported run() functions.
// No dynamic import / path resolution — single source of truth.
const FRAMEWORK_RUNNERS: Record<
  string,
  (input: unknown, flags?: Record<string, unknown>) => Promise<unknown>
> = {};
const FRAMEWORK_REGISTRY = {
  'peer-review': () => import('./frameworks/peer-review'),
  'red-blue': () => import('./frameworks/red-blue'),
  'six-hats': () => import('./frameworks/six-hats'),
  'phd-defense': () => import('./frameworks/phd-defense'),
  'grant-panel': () => import('./frameworks/grant-panel'),
  'intelligence-analysis': () => import('./frameworks/intelligence-analysis'),
  'design-critique': () => import('./frameworks/design-critique'),
  'consensus-circle': () => import('./frameworks/consensus-circle'),
  'differential-diagnosis': () => import('./frameworks/differential-diagnosis'),
  'tumor-board': () => import('./frameworks/tumor-board'),
  'war-gaming': () => import('./frameworks/war-gaming'),
  'writers-workshop': () => import('./frameworks/writers-workshop'),
  'regulatory-impact': () => import('./frameworks/regulatory-impact'),
  'devils-advocate': () => import('./frameworks/devils-advocate'),
  aar: () => import('./frameworks/aar'),
  courtroom: () => import('./frameworks/courtroom'),
  delphi: () => import('./frameworks/delphi'),
  hegelian: () => import('./frameworks/hegelian'),
  parliamentary: () => import('./frameworks/parliamentary'),
  'pre-mortem': () => import('./frameworks/pre-mortem'),
  socratic: () => import('./frameworks/socratic'),
  studio: () => import('./frameworks/studio'),
  swot: () => import('./frameworks/swot'),
  talmudic: () => import('./frameworks/talmudic'),
  'dissertation-committee': () => import('./frameworks/dissertation-committee'),
  'architecture-review': () => import('./frameworks/architecture-review'),
} as const;

/** Exit codes from a normalized decision, applied uniformly across frameworks. */
function exitCodeForDecision(decision: unknown): number {
  // 0 = affirmative (approve/accept/pass), 1 = negative (reject/fail),
  // 3 = indeterminate (delay/dismissed/unknown)
  const d = String(decision ?? '').toLowerCase();
  if (['approve', 'accept', 'pass', 'ready', 'guilty'].includes(d)) {
    return 0;
  }
  if (['reject', 'fail', 'not_guilty'].includes(d)) {
    return 1;
  }
  return 3;
}

async function runFramework(framework: FrameworkName, inputFile: string, flags: Flags) {
  const loader = FRAMEWORK_REGISTRY[framework as keyof typeof FRAMEWORK_REGISTRY];
  if (!loader) {
    console.error(`\n❌ Framework '${framework}' not implemented`);
    process.exit(2);
  }

  try {
    const module = await loader();

    if (!module.run) {
      throw new Error(`Framework ${framework} does not export a 'run' function`);
    }

    // Load input file
    const input = await loadInput(inputFile);

    // Build engine flags: CLI flags → RunFlags
    const runFlags: Record<string, unknown> = {
      debug: flags.verbose,
      provider: flags.provider,
      model: flags.model,
      maxCostUSD: flags['max-cost'] ? Number(flags['max-cost']) : undefined,
      config: flags['config-json'] ? JSON.parse(String(flags['config-json'])) : undefined,
    };

    // Wire reporter: pretty by default, silent in JSON mode
    if (flags['output-json']) {
      // JSON mode: silent (no reporter), structured output printed once.
      // Wrappers return the bare result; run the underlying definition to get session/audit.
      const result = (await module.run(input, runFlags)) as unknown as Record<string, unknown>;
      if (flags.output) {
        await writeFile(flags.output, JSON.stringify(result, null, 2), 'utf8');
        console.log(`\n💾 Results saved to: ${flags.output}`);
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
      const decision =
        (result?.metadata as { decision?: string } | undefined)?.decision ??
        (result?.verdict as { decision?: string } | undefined)?.decision;
      process.exit(exitCodeForDecision(decision));
    }

    const sinks: EventSink[] = [prettyReporter(flags.verbose ?? false)];

    const result = (await module.run(input, runFlags, sinks)) as unknown as {
      metadata?: { decision?: string };
      verdict?: { decision?: string };
    };

    // Handle output
    if (flags.output) {
      await writeFile(flags.output, JSON.stringify(result, null, 2), 'utf8');
      console.log(`\n💾 Results saved to: ${flags.output}`);
    }

    // Exit code: normalized metadata.decision, falling back to legacy verdict shape
    const decision = result?.metadata?.decision ?? result?.verdict?.decision;
    process.exit(exitCodeForDecision(decision));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      console.error(`\n❌ Framework '${framework}' failed to load: ${error.message}`);
      process.exit(2);
    }
    throw error;
  }
}

async function loadInput(filepath: string): Promise<any> {
  // If filepath is relative, resolve from CWD (user's working directory)
  // If absolute, use as-is
  const resolvedPath = filepath.startsWith('/') ? filepath : resolve(process.cwd(), filepath);

  let raw: string;
  try {
    raw = await readFile(resolvedPath, 'utf8');
  } catch {
    throw new Error(`Input file not found: ${filepath}`);
  }

  // Try to parse as JSON first
  if (filepath.endsWith('.json')) {
    return JSON.parse(raw);
  }

  // Try to parse as JSON anyway
  try {
    return JSON.parse(raw);
  } catch {
    // Return as plain text
    return { content: raw };
  }
}

function parseFlags(args: string[]): Flags {
  const flags: Flags = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];

      if (next && !next.startsWith('-')) {
        // Has value
        flags[key] = next;
        i++;
      } else {
        // Boolean flag
        flags[key] = true;
      }
    } else if (arg.startsWith('-')) {
      // Short flag (always boolean)
      flags[arg.slice(1)] = true;
    }
  }

  return flags;
}

function listFrameworks() {
  console.log(`\n🏛️  Institutional Reasoning Frameworks\n`);
  console.log(`Total: ${FRAMEWORK_NAMES.length} frameworks\n`);

  // Group by tier
  const tiers = new Map<string, FrameworkName[]>();
  for (const name of FRAMEWORK_NAMES) {
    const tier = FRAMEWORKS[name].tier;
    if (!tiers.has(tier)) {
      tiers.set(tier, []);
    }
    tiers.get(tier)!.push(name);
  }

  for (const [tier, names] of tiers) {
    console.log(`\n${tier}:`);
    console.log(`  ${names.map((n) => n.padEnd(20)).join('  ')}`);
    console.log(
      `  ${names.map((n) => FRAMEWORKS[n].description.slice(0, 50).padEnd(50)).join('  ')}`
    );
  }

  console.log(`\n\n📖 Categories:`);
  const categories = new Map<string, FrameworkName[]>();
  for (const name of FRAMEWORK_NAMES) {
    const category = FRAMEWORKS[name].category;
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(name);
  }

  for (const [category, names] of categories) {
    console.log(`\n  ${category}:`);
    for (const name of names) {
      console.log(`    - ${name}: ${FRAMEWORKS[name].description}`);
    }
  }

  console.log(`\n💡 Usage: institutional-reasoning <framework> <input-file> [options]`);
  console.log(`   Example: institutional-reasoning courtroom case.json --verbose`);
}

async function interactiveMode() {
  const rl = createInterface({ input, output });

  console.log(`\n🏛️  Institutional Reasoning - Interactive Mode\n`);

  // List frameworks with numbers
  console.log(`Available frameworks:\n`);
  FRAMEWORK_NAMES.forEach((name, index) => {
    const fw = FRAMEWORKS[name];
    console.log(`  ${index + 1}. ${name.padEnd(20)} ${fw.tier.padEnd(15)} - ${fw.description}`);
  });

  // Select framework
  const frameworkIndex = await askNumber(
    rl,
    `\n📌 Select framework (1-${FRAMEWORK_NAMES.length})`,
    1,
    FRAMEWORK_NAMES.length
  );
  const framework = FRAMEWORK_NAMES[frameworkIndex - 1];

  // Input file
  const inputFile = await askString(rl, `\n📄 Input file path`);

  // Verify file exists
  try {
    await readFile(inputFile, 'utf8');
  } catch {
    console.error(`\n❌ File not found: ${inputFile}`);
    rl.close();
    process.exit(1);
  }

  // Additional flags
  const verbose = await askYesNo(rl, `\n🔍 Verbose output? (y/n)`);
  const outputFile = await askString(rl, `💾 Output file (leave empty for console)`);

  rl.close();

  const flags: Flags = {
    verbose,
    output: outputFile || undefined,
  };

  console.log(`\n✅ Running ${framework} on ${inputFile}...\n`);

  try {
    await runFramework(framework, inputFile, flags);
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }
}

async function askString(rl: any, question: string): Promise<string> {
  const answer = await rl.question(`${question}: `);
  return answer.trim();
}

async function askYesNo(rl: any, question: string): Promise<boolean> {
  const answer = await rl.question(`${question} [y/N]: `);
  return answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes';
}

async function askNumber(rl: any, question: string, min: number, max: number): Promise<number> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const answer = await rl.question(`${question}: `);
    const num = parseInt(answer.trim(), 10);
    if (isNaN(num) || num < min || num > max) {
      console.log(`Please enter a number between ${min} and ${max}`);
    } else {
      return num;
    }
  }
}

// Framework recommendation categories
const USE_CASE_CATEGORIES = {
  'Make a decision': ['courtroom', 'six-hats', 'swot', 'hegelian', 'devils-advocate'],
  'Review something': [
    'peer-review',
    'phd-defense',
    'dissertation-committee',
    'design-critique',
    'studio',
  ],
  'Find risks': ['pre-mortem', 'aar', 'intelligence-analysis', 'differential-diagnosis'],
  'Validate a system': ['architecture-review', 'red-blue', 'war-gaming', 'tumor-board'],
  'Need consensus': ['consensus-circle', 'delphi', 'parliamentary'],
  'Challenge assumptions': ['devils-advocate', 'socratic', 'tumor-board'],
  'Get creative feedback': ['studio', 'writers-workshop', 'design-critique'],
  'Medical-style diagnosis': ['tumor-board', 'differential-diagnosis'],
  'Policy analysis': ['regulatory-impact', 'parliamentary'],
} as const;

// Follow-up questions for each use case
const FOLLOW_UP_QUESTIONS: Record<string, string[]> = {
  'Make a decision': [
    'Need adversarial debate (yes/no)?',
    'Need multiple perspectives?',
    'Need strategic SWOT analysis?',
    'Need philosophical synthesis?',
  ],
  'Review something': [
    'Academic paper or document?',
    'Thesis or dissertation?',
    'Design or creative work?',
    'Code or technical work?',
  ],
  'Find risks': [
    'Before launching (pre-mortem)?',
    'After something happened (post-mortem)?',
    'Diagnostic troubleshooting?',
    'Systematic elimination?',
  ],
  'Validate a system': [
    'Architecture or design?',
    'Security testing?',
    'Strategic war gaming?',
    'Medical-style diagnosis?',
  ],
  'Need consensus': ['Without voting?', 'Anonymous expert input?', 'Formal policy debate?'],
  'Challenge assumptions': [
    'Formal opposition challenge?',
    'Socratic questioning?',
    'Multi-specialist review?',
  ],
  'Get creative feedback': [
    'Design or art?',
    'Manuscript or novel?',
    'Structured design critique?',
  ],
  'Medical-style diagnosis': ['Multi-specialist input?', 'Root cause elimination?'],
  'Policy analysis': ['Regulatory impact assessment?', 'Adversarial policy debate?'],
};

// Mapping from follow-up answers to framework recommendations
const RECOMMENDATION_MAPPING: Record<string, Record<string, string>> = {
  'Make a decision': {
    yes: 'courtroom',
    adversarial: 'courtroom',
    perspectives: 'six-hats',
    'multiple perspectives': 'six-hats',
    strategic: 'swot',
    SWOT: 'swot',
    philosophical: 'hegelian',
    synthesis: 'hegelian',
  },
  'Review something': {
    academic: 'peer-review',
    paper: 'peer-review',
    document: 'peer-review',
    thesis: 'phd-defense',
    dissertation: 'dissertation-committee',
    design: 'design-critique',
    creative: 'studio',
    code: 'peer-review',
    technical: 'peer-review',
  },
  'Find risks': {
    before: 'pre-mortem',
    'pre-mortem': 'pre-mortem',
    launch: 'pre-mortem',
    after: 'aar',
    'post-mortem': 'aar',
    diagnostic: 'intelligence-analysis',
    troubleshooting: 'differential-diagnosis',
    elimination: 'differential-diagnosis',
  },
  'Validate a system': {
    architecture: 'architecture-review',
    design: 'architecture-review',
    security: 'red-blue',
    war: 'war-gaming',
    gaming: 'war-gaming',
    medical: 'tumor-board',
  },
  'Need consensus': {
    'without voting': 'consensus-circle',
    anonymous: 'delphi',
    expert: 'delphi',
    policy: 'parliamentary',
    debate: 'parliamentary',
  },
  'Challenge assumptions': {
    opposition: 'devils-advocate',
    formal: 'devils-advocate',
    questioning: 'socratic',
    socratic: 'socratic',
    multi: 'tumor-board',
    specialist: 'tumor-board',
  },
  'Get creative feedback': {
    design: 'studio',
    art: 'studio',
    manuscript: 'writers-workshop',
    novel: 'writers-workshop',
    critique: 'design-critique',
    structured: 'design-critique',
  },
  'Medical-style diagnosis': {
    multi: 'tumor-board',
    specialist: 'tumor-board',
    elimination: 'differential-diagnosis',
    root: 'differential-diagnosis',
  },
  'Policy analysis': {
    regulatory: 'regulatory-impact',
    impact: 'regulatory-impact',
    debate: 'parliamentary',
    adversarial: 'parliamentary',
  },
};

async function recommendFramework() {
  const rl = createInterface({ input, output });

  console.log(`\n🎯  Institutional Reasoning - Framework Recommender\n`);
  console.log(`Answer a few questions to find the perfect framework for your use case.\n`);

  // Step 1: Ask main use case
  const useCases = Object.keys(USE_CASE_CATEGORIES);
  console.log(`What are you trying to do?\n`);

  useCases.forEach((uc, index) => {
    console.log(`  ${index + 1}. ${uc}`);
  });

  const useCaseIndex = await askNumber(
    rl,
    `\nSelect your use case (1-${useCases.length})`,
    1,
    useCases.length
  );
  const selectedUseCase = useCases[useCaseIndex - 1];
  const candidateFrameworks =
    USE_CASE_CATEGORIES[selectedUseCase as keyof typeof USE_CASE_CATEGORIES];

  rl.close();

  // Step 2: For simplicity in CLI, just show recommendations based on use case
  // In a more interactive version, we'd ask follow-up questions
  console.log(`\n📋 Based on "${selectedUseCase}", here are the recommended frameworks:\n`);

  const frameworksInCategory = candidateFrameworks;

  // Show each framework with its details
  frameworksInCategory.forEach((fwName, idx) => {
    const fw = FRAMEWORKS[fwName];
    console.log(`  ${idx + 1}. ${fwName}`);
    console.log(`     Category: ${fw.category}`);
    console.log(`     Purpose: ${fw.purpose}`);
    console.log(`     Complexity: ${fw.complexity}`);
    console.log(`     Best for: ${fw.bestFor}`);
    console.log(`     Typical time: ${fw.typicalTime}`);
    console.log(`     Agents: ${fw.agents.join(', ')}`);
    console.log('');
  });

  console.log(`\n💡 Quick Start:`);
  frameworksInCategory.slice(0, 3).forEach((fwName) => {
    const example = FRAMEWORKS[fwName].exampleUseCases[0];
    console.log(`   institutional-reasoning ${fwName} "${example}"`);
  });

  console.log(`\n🎯 Top recommendation: ${frameworksInCategory[0]}`);
  console.log(`   Description: ${FRAMEWORKS[frameworksInCategory[0]].description}`);
  console.log(
    `   Command: institutional-reasoning ${frameworksInCategory[0]} <input-file> --verbose`
  );
}

async function showHelp() {
  let version = 'unknown';
  try {
    const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
    version = pkg.version;
  } catch {
    // keep 'unknown'
  }

  console.log(`
🏛️  Institutional Reasoning v${version}
`);
  console.log(`LLM decision-making frameworks based on centuries-old human systems\n`);

  console.log(`Usage:`);
  console.log(`  institutional-reasoning <framework> <input-file> [options]`);
  console.log(`  institutional-reasoning --list`);
  console.log(`  institutional-reasoning --interactive`);
  console.log(`  institutional-reasoning --which`);
  console.log(`  institutional-reasoning --help`);
  console.log(`  institutional-reasoning --version\n`);

  console.log(`Framework Categories:`);
  const categories = new Map<string, FrameworkName[]>();
  for (const name of FRAMEWORK_NAMES) {
    const category = FRAMEWORKS[name].category;
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(name);
  }

  for (const [category, names] of categories) {
    console.log(`\n  ${category}:`);
    for (const name of names) {
      console.log(`    ${name.padEnd(20)} - ${FRAMEWORKS[name].description}`);
    }
  }

  console.log(`\n\nQuick Start:`);
  console.log(`  # Decision making`);
  console.log(`  institutional-reasoning courtroom case.json`);
  console.log(`\n  # Peer review`);
  console.log(`  institutional-reasoning peer-review paper.md`);
  console.log(`\n  # Risk analysis`);
  console.log(`  institutional-reasoning pre-mortem launch-plan.md`);
  console.log(`\n  # Multi-perspective`);
  console.log(`  institutional-reasoning six-hats decision.txt`);

  console.log(`\n\nOptions:`);
  console.log(`  --verbose, -v     Stream per-agent progress, cost, timing`);
  console.log(`  --output FILE    Save result JSON to file`);
  console.log(`  --output-json    Print full result JSON to stdout (machine-readable)`);
  console.log(`  --provider NAME  LLM provider: anthropic | openai | openrouter`);
  console.log(`  --model ID       Model override (e.g. openai/gpt-4o-mini)`);
  console.log(`  --max-cost USD   Hard cost ceiling for the run`);
  console.log(`  --config-json J  Framework config overrides (JSON string)`);
  console.log(`  --list, -l       List all available frameworks`);
  console.log(`  --interactive, -i Interactive mode`);
  console.log(`  --which          Framework recommender (interactive)`);
  console.log(`  --recommend      Same as --which`);
  console.log(`  --help, -h       Show this help message`);
  console.log(`  --version        Show version number\n`);

  console.log(`Exit Codes:`);
  console.log(`  0  Affirmative decision (approve/accept/ready)`);
  console.log(`  1  Negative decision (reject/fail)`);
  console.log(`  2  Error occurred`);
  console.log(`  3  Indeterminate (delay/dismissed/analysis-only)\n`);

  console.log(`Documentation: https://github.com/behole/institutionalized\n`);
}

// Run if executed directly
if (import.meta.main) {
  main();
}
