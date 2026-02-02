---
name: institutional-lite
description: Lightweight, single-call decision frameworks (courtroom, peer review, red/blue, pre-mortem, six-hats, studio critique) using role simulation for fast LLM output without multi-agent orchestration.
metadata:
  short-description: Lightweight decision frameworks
---

# Institutional Lite

Use this skill when the user wants fast, lightweight analysis without multi-agent orchestration, audit logs, or heavy infrastructure.

## Quick workflow (single call)

1) Pick the framework that matches the user's intent.
2) Use the matching template from `references/framework-templates.md`.
3) Ask for JSON only (no markdown). Keep it concise and action-oriented.

## Output rules

- Output valid JSON only (no code fences).
- Use only the provided input; mark unknowns as "unknown".
- Keep each section short (3-7 bullets/items max).
- Prefer concrete actions over vague advice.
- If input is insufficient, add a short `missing_info` array.

## Framework selection guide

- courtroom: binary decision under uncertainty.
- peer_review: evaluate a submission with reviewer/editor structure.
- red_blue: stress-test a system or plan.
- pre_mortem: enumerate likely failure scenarios.
- six_hats: multi-perspective analysis of a decision.
- studio_critique: creative work feedback.

## When not to use

- You need full audit trails, replayability, or cost accounting.
- You need per-agent isolation or multiple model calls.
- You need long-form analysis beyond a single response.
