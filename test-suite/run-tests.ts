#!/usr/bin/env bun

/**
 * Test runner for Institutional Reasoning frameworks
 * Runs baseline test cases across all applicable frameworks
 */

import { readFileSync } from "fs";
import { resolve } from "path";

interface TestCase {
  name: string;
  description: string;
  [framework: string]: any;
}

interface TestResult {
  framework: string;
  testCase: string;
  status: "pass" | "fail" | "skip";
  duration: number;
  error?: string;
}

const FRAMEWORKS = [
  { name: "courtroom", dir: "../courtroom-poc", cmd: "bun run src/cli.ts" },
  { name: "peer-review", dir: "../peer-review-poc", cmd: "bun run src/cli.ts" },
  { name: "red-blue-team", dir: "../red-blue-team-poc", cmd: "bun run src/cli.ts" },
  { name: "pre-mortem", dir: "../pre-mortem-poc", cmd: "bun run src/cli.ts" },
  { name: "studio-critique", dir: "../studio-critique-poc", cmd: "bun run src/cli.ts" },
];

const TEST_CASES = [
  "api-migration.json",
  "product-launch.json",
  "essay-skateboarding.json",
  "auth-system.json",
];

async function loadTestCase(filename: string): Promise<TestCase> {
  const path = resolve(__dirname, "cases", filename);
  const content = readFileSync(path, "utf-8");
  return JSON.parse(content);
}

async function runTest(
  framework: string,
  frameworkDir: string,
  cmd: string,
  testCase: TestCase
): Promise<TestResult> {
  const startTime = Date.now();

  // Check if this framework is applicable for this test case
  // Map framework names to test case keys
  const frameworkKeyMap: Record<string, string> = {
    "courtroom": "courtroom",
    "peer-review": "peerReview",
    "red-blue-team": "redBlueTeam",
    "pre-mortem": "preMortem",
    "studio-critique": "studioCritique",
  };

  const frameworkKey = frameworkKeyMap[framework];
  if (!testCase[frameworkKey]) {
    return {
      framework,
      testCase: testCase.name,
      status: "skip",
      duration: 0,
    };
  }

  try {
    // Create temp input file for this test
    const input = testCase[frameworkKey];
    const tempInputPath = `/tmp/ir-test-${framework}-${Date.now()}.json`;
    const tempOutputPath = `/tmp/ir-test-${framework}-${Date.now()}-result.json`;

    await Bun.write(tempInputPath, JSON.stringify(input, null, 2));

    // Run the framework
    const proc = Bun.spawn(
      cmd.split(" ").concat([tempInputPath, "--output", tempOutputPath]),
      {
        cwd: resolve(__dirname, frameworkDir),
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const exitCode = await proc.exited;
    const duration = Date.now() - startTime;

    // Framework may exit with non-zero (e.g., reject decision) but that's still a pass
    // Only fail if there was an actual error
    const stderr = await new Response(proc.stderr).text();

    if (stderr.includes("Error") && !stderr.includes("error:")) {
      return {
        framework,
        testCase: testCase.name,
        status: "fail",
        duration,
        error: stderr.slice(0, 200),
      };
    }

    return {
      framework,
      testCase: testCase.name,
      status: "pass",
      duration,
    };
  } catch (error) {
    return {
      framework,
      testCase: testCase.name,
      status: "fail",
      duration: Date.now() - startTime,
      error: String(error).slice(0, 200),
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes("--verbose");
  const quickTest = args.includes("--quick");

  console.log("\n" + "=".repeat(80));
  console.log("INSTITUTIONAL REASONING TEST SUITE");
  console.log("=".repeat(80) + "\n");

  const results: TestResult[] = [];

  // Load test cases
  const testCases = await Promise.all(
    TEST_CASES.map((filename) => loadTestCase(filename))
  );

  // Quick test: Just run one test per framework
  const casesToRun = quickTest ? [testCases[0]] : testCases;

  console.log(`Running ${casesToRun.length} test cases across ${FRAMEWORKS.length} frameworks...\n`);

  // Run tests
  for (const testCase of casesToRun) {
    console.log(`\n📋 Test Case: ${testCase.name}`);
    console.log(`   ${testCase.description}\n`);

    for (const framework of FRAMEWORKS) {
      process.stdout.write(`   ${framework.name.padEnd(20)} ... `);

      const result = await runTest(
        framework.name,
        framework.dir,
        framework.cmd,
        testCase
      );

      results.push(result);

      if (result.status === "pass") {
        console.log(`✅ PASS (${result.duration}ms)`);
      } else if (result.status === "skip") {
        console.log(`⏭️  SKIP`);
      } else {
        console.log(`❌ FAIL (${result.duration}ms)`);
        if (verbose && result.error) {
          console.log(`      Error: ${result.error}`);
        }
      }
    }
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80) + "\n");

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skip").length;

  console.log(`Total tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);

  // Per-framework breakdown
  console.log("\nPer-Framework Results:");
  for (const framework of FRAMEWORKS) {
    const frameworkResults = results.filter((r) => r.framework === framework.name);
    const frameworkPassed = frameworkResults.filter((r) => r.status === "pass").length;
    const frameworkFailed = frameworkResults.filter((r) => r.status === "fail").length;
    const frameworkSkipped = frameworkResults.filter((r) => r.status === "skip").length;

    console.log(
      `  ${framework.name.padEnd(20)} ${frameworkPassed}/${frameworkResults.length - frameworkSkipped} passed`
    );

    if (frameworkFailed > 0 && verbose) {
      const failures = frameworkResults.filter((r) => r.status === "fail");
      failures.forEach((f) => {
        console.log(`    ❌ ${f.testCase}: ${f.error}`);
      });
    }
  }

  console.log();

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

main();
