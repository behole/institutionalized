import { describe, test, expect } from "bun:test";
import { runCourtroom } from "../../frameworks/courtroom/orchestrator";
import { DEFAULT_CONFIG } from "../../frameworks/courtroom/types";
import type { Case } from "../../frameworks/courtroom/types";
import { MockProvider } from "../../core/providers/mock";
import { mockResponse } from "../helpers";

describe("Courtroom Integration", () => {
  test("full courtroom flow with mock provider", async () => {
    const caseInput: Case = {
      question: "Should we adopt TypeScript?",
      context: ["Team knows JavaScript", "TypeScript adds safety"],
    };

    const config = {
      ...DEFAULT_CONFIG,
      parameters: { ...DEFAULT_CONFIG.parameters, jurySize: 3, juryThreshold: 2 },
      validation: { requireExactQuotes: true, minHarmWords: 10 },
    };

    // Agent sequence: prosecutor, defense, juror-1, juror-2, juror-3, judge
    const provider = new MockProvider([
      // Prosecutor: sourceQuotes must exactly match context strings; harm must be 10+ words
      mockResponse(JSON.stringify({
        caseStatement: "TypeScript provides compile-time type safety reducing runtime errors.",
        exhibits: [
          {
            sourceQuote: "Team knows JavaScript",
            targetQuote: "TypeScript adds safety",
            harm: "Without types, bugs ship to production and customers experience runtime failures.",
          },
        ],
        harmAnalysis: "The team risks shipping type errors without TypeScript adoption.",
      })),
      // Defense: counterArgument/harmDispute/alternative each ≥50 chars; exhibitChallenges reference exhibit 1
      mockResponse(JSON.stringify({
        counterArgument: "TypeScript adds significant complexity for a team already productive and well-versed in JavaScript workflows.",
        exhibitChallenges: [{ exhibit: 1, challenge: "JavaScript has runtime checks too and the team is already productive." }],
        harmDispute: "The harm is overstated; small projects succeed without TypeScript every day in production.",
        alternative: "Use JSDoc types instead, which provides type hints without a compilation step or tooling overhead.",
      })),
      // Juror 1: reasoning ≥100 chars
      mockResponse(JSON.stringify({
        reasoning: "After carefully weighing both sides, type safety prevents bugs at scale and the prosecution made a compelling case that the long-term benefits of TypeScript outweigh the short-term learning curve for the team.",
        vote: "guilty",
      })),
      // Juror 2: reasoning ≥100 chars
      mockResponse(JSON.stringify({
        reasoning: "The defense raised valid concerns about the overhead of TypeScript for a team already deeply comfortable with JavaScript. The migration cost is real and not worth it for small projects.",
        vote: "not_guilty",
      })),
      // Juror 3: reasoning ≥100 chars
      mockResponse(JSON.stringify({
        reasoning: "Having considered both arguments thoroughly, the benefits of compile-time type checking clearly outweigh the costs, especially as the codebase grows larger and maintenance becomes critical.",
        vote: "guilty",
      })),
      // Judge: reasoning ≥200 chars, rationale ≥20 chars, if guilty must have actions
      mockResponse(JSON.stringify({
        decision: "guilty",
        reasoning: "Having reviewed the prosecution's case, defense rebuttal, and jury deliberations, I find the evidence strongly supports adopting TypeScript. The prosecution demonstrated that type safety prevents runtime errors, and two of three jurors agreed. The defense's concerns about overhead are valid but manageable through incremental migration. The long-term benefits of maintainability and reduced bugs outweigh the short-term learning curve. TypeScript adoption is the correct decision.",
        rationale: "2-1 jury vote supports TypeScript adoption with clear long-term benefits.",
        confidence: 0.75,
        actions: ["Migrate incrementally starting with new modules"],
      })),
    ]);

    const result = await runCourtroom(caseInput, config, provider);

    // Structure assertions
    expect(result.case.question).toBe("Should we adopt TypeScript?");
    expect(result.prosecution).toBeDefined();
    expect(result.prosecution.caseStatement).toContain("type safety");
    expect(result.defense).toBeDefined();
    expect(result.defense.counterArgument).toBeDefined();
    expect(result.jury.jurors).toHaveLength(3);
    expect(result.verdict.decision).toBe("guilty");

    // Agent call count: prosecutor + defense + 3 jurors + judge = 6
    expect(provider.calls).toHaveLength(6);
  });

  test("case dismissed when jury threshold not met", async () => {
    const caseInput: Case = {
      question: "Should we rewrite in Rust?",
      context: ["Team only knows JavaScript"],
    };

    const config = {
      ...DEFAULT_CONFIG,
      parameters: { ...DEFAULT_CONFIG.parameters, jurySize: 3, juryThreshold: 2 },
      validation: { requireExactQuotes: true, minHarmWords: 10 },
    };

    const provider = new MockProvider([
      // Prosecutor: sourceQuote must match context exactly; harm 10+ words
      mockResponse(JSON.stringify({
        caseStatement: "Rust provides memory safety and prevents entire classes of bugs at compile time.",
        exhibits: [
          {
            sourceQuote: "Team only knows JavaScript",
            targetQuote: "Team needs to learn Rust",
            harm: "JavaScript has memory management issues that could lead to serious production problems at scale.",
          },
        ],
        harmAnalysis: "JavaScript memory issues create long-term risk in high-performance applications.",
      })),
      // Defense: all fields ≥50 chars, challenge references exhibit 1
      mockResponse(JSON.stringify({
        counterArgument: "The team has no Rust experience whatsoever, making a full rewrite extremely risky and time-consuming.",
        exhibitChallenges: [{ exhibit: 1, challenge: "JavaScript memory issues are manageable with proper patterns and tooling." }],
        harmDispute: "JavaScript works perfectly fine for the vast majority of production systems running today worldwide.",
        alternative: "Stay with JavaScript and focus on improving code quality, testing, and existing tooling instead of rewriting.",
      })),
      // Juror 1: reasoning ≥100 chars
      mockResponse(JSON.stringify({
        reasoning: "A full rewrite in Rust for a team that only knows JavaScript is far too risky and would cause significant project delays without clear justification for the performance gains needed.",
        vote: "not_guilty",
      })),
      // Juror 2: reasoning ≥100 chars
      mockResponse(JSON.stringify({
        reasoning: "The rewrite cost and learning curve are simply not worth it given the current team composition. JavaScript is sufficient for the foreseeable future and the risk outweighs the reward.",
        vote: "not_guilty",
      })),
      // Juror 3: reasoning ≥100 chars
      mockResponse(JSON.stringify({
        reasoning: "While Rust has excellent memory safety properties, the team's lack of experience makes this proposal impractical. I cannot decide without more data on the actual performance bottlenecks.",
        vote: "abstain",
      })),
    ]);

    const result = await runCourtroom(caseInput, config, provider);

    expect(result.verdict.decision).toBe("dismissed");
    // No judge call when dismissed: prosecutor + defense + 3 jurors = 5
    expect(provider.calls).toHaveLength(5);
  });
});
