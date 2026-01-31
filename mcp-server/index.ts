#!/usr/bin/env bun
/**
 * MCP Server for Institutional Reasoning Frameworks
 *
 * Exposes all 20 frameworks as MCP tools for use in Claude Code and other MCP clients.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Framework metadata
const FRAMEWORKS = {
  // Tier 1 - MVP
  courtroom: {
    name: "courtroom",
    description: "Adversarial evaluation for binary decisions. Uses prosecutor, defense, jury, and judge to reach verdicts.",
    tier: 1,
    inputSchema: {
      type: "object",
      properties: {
        charge: { type: "string", description: "The charge/decision being evaluated" },
        evidence: { type: "array", items: { type: "string" }, description: "Evidence for consideration" },
        context: { type: "string", description: "Background context" },
        verbose: { type: "boolean", description: "Show detailed execution logs" },
      },
      required: ["charge"],
    },
  },
  "peer-review": {
    name: "peer-review",
    description: "Academic-style validation with author rebuttal. Multiple reviewers critique, author responds, editor synthesizes.",
    tier: 1,
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        abstract: { type: "string" },
        document: { type: "string", description: "Full document to review" },
        reviewers: { type: "number", description: "Number of reviewers (default: 3)" },
        verbose: { type: "boolean" },
      },
      required: ["document"],
    },
  },
  "red-blue": {
    name: "red-blue",
    description: "Military stress-testing for security and architecture. Blue team proposes, red team attacks, observer synthesizes vulnerabilities.",
    tier: 1,
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        system: { type: "string", description: "System design to test" },
        rounds: { type: "number", description: "Number of attack rounds (default: 3)" },
        verbose: { type: "boolean" },
      },
      required: ["system"],
    },
  },
  "pre-mortem": {
    name: "pre-mortem",
    description: "Identify failure modes before committing. Pessimists imagine ways things could fail, facilitator synthesizes risks.",
    tier: 1,
    inputSchema: {
      type: "object",
      properties: {
        plan: { type: "string", description: "The plan/project to analyze" },
        goal: { type: "string" },
        context: { type: "string" },
        pessimists: { type: "number", description: "Number of pessimists (default: 5)" },
        verbose: { type: "boolean" },
      },
      required: ["plan"],
    },
  },
  studio: {
    name: "studio",
    description: "Creative work evaluation with peer feedback. Silent observation, structured critique, creator response, instructor synthesis.",
    tier: 1,
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        work: { type: "string", description: "Creative work to critique" },
        medium: { type: "string" },
        intent: { type: "string" },
        peers: { type: "number", description: "Number of peer critics (default: 3)" },
        verbose: { type: "boolean" },
      },
      required: ["work"],
    },
  },
  // Tier 2 - High Demand
  "devils-advocate": {
    name: "devils-advocate",
    description: "Formal challenge to proposals. Opposition attacks, proposer rebuts, arbiter decides.",
    tier: 2,
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        proposal: { type: "string", description: "Proposal to challenge" },
        background: { type: "string" },
        verbose: { type: "boolean" },
      },
      required: ["proposal"],
    },
  },
  aar: {
    name: "aar",
    description: "After-Action Review for blameless learning from execution. Analyzes what happened vs. expected.",
    tier: 2,
    inputSchema: {
      type: "object",
      properties: {
        situation: { type: "string" },
        intended: { type: "array", items: { type: "string" }, description: "What was intended to happen" },
        actual: { type: "array", items: { type: "string" }, description: "What actually happened" },
        verbose: { type: "boolean" },
      },
      required: ["situation"],
    },
  },
  "six-hats": {
    name: "six-hats",
    description: "Multi-perspective analysis using Edward de Bono's method. Six thinking hats examine from different angles.",
    tier: 2,
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Question or decision to analyze" },
        context: { type: "string" },
        verbose: { type: "boolean" },
      },
      required: ["question"],
    },
  },
  "phd-defense": {
    name: "phd-defense",
    description: "Rigorous proposal validation through doctoral examination. Committee members probe deeply.",
    tier: 2,
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        abstract: { type: "string" },
        document: { type: "string", description: "Proposal document" },
        committee: { type: "number", description: "Committee size (default: 5)" },
        verbose: { type: "boolean" },
      },
      required: ["document"],
    },
  },
  "architecture-review": {
    name: "architecture-review",
    description: "System design validation from multiple specialist perspectives (performance, security, ops, cost, maintainability).",
    tier: 2,
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        design: { type: "string", description: "Architecture design document" },
        verbose: { type: "boolean" },
      },
      required: ["design"],
    },
  },
  // Tier 3 - Specialized
  "grant-panel": {
    name: "grant-panel",
    description: "Comparative prioritization under resource constraints. Reviewers score independently, panel calibrates and allocates.",
    tier: 3,
    inputSchema: {
      type: "object",
      properties: {
        proposals: { type: "string", description: "JSON array of proposals or single proposal text" },
        budget: { type: "number", description: "Total budget available" },
        reviewers: { type: "number", description: "Reviewers per proposal (default: 3)" },
        verbose: { type: "boolean" },
      },
      required: ["proposals"],
    },
  },
  "intelligence-analysis": {
    name: "intelligence-analysis",
    description: "Diagnostic reasoning via competing hypotheses (CIA method). Generate hypotheses, evaluate evidence, rank by likelihood.",
    tier: 3,
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Problem to analyze" },
        evidence: { type: "array", items: { type: "string" }, description: "Available evidence" },
        context: { type: "string" },
        verbose: { type: "boolean" },
      },
      required: ["question"],
    },
  },
  delphi: {
    name: "delphi",
    description: "Expert consensus building through iterative anonymous rounds. Experts refine estimates based on group feedback.",
    tier: 3,
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Question for expert consensus" },
        context: { type: "string" },
        experts: { type: "number", description: "Number of experts (default: 5)" },
        rounds: { type: "number", description: "Max rounds (default: 3)" },
        verbose: { type: "boolean" },
      },
      required: ["question"],
    },
  },
  "design-critique": {
    name: "design-critique",
    description: "Structured design feedback. Peers and stakeholders provide categorized feedback, facilitator synthesizes.",
    tier: 3,
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        artifacts: { type: "string", description: "Design artifacts/mockups" },
        peers: { type: "number", description: "Number of peers (default: 3)" },
        verbose: { type: "boolean" },
      },
      required: ["artifacts"],
    },
  },
  "consensus-circle": {
    name: "consensus-circle",
    description: "Quaker-style consensus without voting. All voices heard, blocking concerns addressed, unity emerges.",
    tier: 3,
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Proposal for consensus" },
        context: { type: "string" },
        participants: { type: "number", description: "Number of participants (default: 5)" },
        verbose: { type: "boolean" },
      },
      required: ["question"],
    },
  },
  // Tier 4 - Advanced
  "differential-diagnosis": {
    name: "differential-diagnosis",
    description: "Systematic diagnostic reasoning. Generate differentials, recommend tests, synthesize final diagnosis.",
    tier: 4,
    inputSchema: {
      type: "object",
      properties: {
        presenting: { type: "string", description: "Presenting problem" },
        symptoms: { type: "array", items: { type: "string" }, description: "Symptoms" },
        history: { type: "string" },
        verbose: { type: "boolean" },
      },
      required: ["presenting"],
    },
  },
  socratic: {
    name: "socratic",
    description: "Assumption testing through systematic questioning. Socrates asks probing questions, respondent refines understanding.",
    tier: 4,
    inputSchema: {
      type: "object",
      properties: {
        claim: { type: "string", description: "Claim to examine" },
        context: { type: "string" },
        rounds: { type: "number", description: "Max questioning rounds (default: 5)" },
        verbose: { type: "boolean" },
      },
      required: ["claim"],
    },
  },
  swot: {
    name: "swot",
    description: "Strategic situational assessment. Internal analyst (S/W), external analyst (O/T), strategist synthesizes.",
    tier: 4,
    inputSchema: {
      type: "object",
      properties: {
        entity: { type: "string", description: "Entity to analyze" },
        description: { type: "string" },
        currentState: { type: "string" },
        verbose: { type: "boolean" },
      },
      required: ["entity", "description"],
    },
  },
  "tumor-board": {
    name: "tumor-board",
    description: "Multi-specialist consensus for complex decisions. Specialists from different domains contribute, chair synthesizes recommendation.",
    tier: 4,
    inputSchema: {
      type: "object",
      properties: {
        caseId: { type: "string" },
        summary: { type: "string", description: "Case summary" },
        patientFactors: { type: "array", items: { type: "string" } },
        verbose: { type: "boolean" },
      },
      required: ["summary"],
    },
  },
  parliamentary: {
    name: "parliamentary",
    description: "Adversarial policy discussion with formal debate structure. Government/opposition speeches, backbench contributions, vote.",
    tier: 4,
    inputSchema: {
      type: "object",
      properties: {
        motion: { type: "string", description: "Parliamentary motion" },
        context: { type: "string" },
        backbenchers: { type: "number", description: "Number of backbenchers (default: 3)" },
        verbose: { type: "boolean" },
      },
      required: ["motion"],
    },
  },
} as const;

const server = new Server(
  {
    name: "institutional-reasoning",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List all framework tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.values(FRAMEWORKS).map((framework) => ({
      name: framework.name,
      description: `[Tier ${framework.tier}] ${framework.description}`,
      inputSchema: framework.inputSchema,
    })),
  };
});

// Execute framework
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!FRAMEWORKS[name as keyof typeof FRAMEWORKS]) {
    throw new Error(`Unknown framework: ${name}`);
  }

  try {
    // Dynamic import of framework
    const frameworkPath = `../frameworks/${name}/index.ts`;
    const framework = await import(frameworkPath);

    if (!framework.run) {
      throw new Error(`Framework ${name} does not export a 'run' function`);
    }

    // Run framework
    const result = await framework.run(args, args);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Institutional Reasoning MCP Server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
