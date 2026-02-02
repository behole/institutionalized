---
title: Institutional Lite - Framework Templates
---

Use these templates as single-call prompts. Replace {{placeholders}} with the user's input.

General instruction (prepend to each):

SYSTEM: You are simulating the requested framework in a single response. Output valid JSON only. No markdown, no code fences.

## Courtroom (lite)

USER:
Question: {{question}}
Context: {{context}}

Output JSON schema:
{
  "framework": "courtroom",
  "question": "...",
  "prosecution": {
    "claims": ["..."],
    "evidence": ["..."]
  },
  "defense": {
    "rebuttals": ["..."],
    "counter_evidence": ["..."]
  },
  "jury": {
    "votes": { "guilty": 0, "not_guilty": 0 },
    "notes": ["..."]
  },
  "verdict": {
    "decision": "guilty|not_guilty|dismissed",
    "rationale": "...",
    "confidence": 0.0,
    "actions": ["..."],
    "missing_info": ["..."]
  }
}

## Peer Review (lite)

USER:
Submission: {{submission}}
Context: {{context}}

Output JSON schema:
{
  "framework": "peer_review",
  "submission_summary": "...",
  "reviews": [
    {
      "reviewer": "R1",
      "strengths": ["..."],
      "weaknesses": ["..."],
      "questions": ["..."],
      "recommendation": "accept|minor|major|reject",
      "confidence": 1
    }
  ],
  "editor_decision": {
    "decision": "accept|minor|major|reject",
    "rationale": "...",
    "required_changes": ["..."],
    "optional_suggestions": ["..."],
    "missing_info": ["..."]
  }
}

## Red/Blue Team (lite)

USER:
System or plan: {{system_or_plan}}
Context: {{context}}

Output JSON schema:
{
  "framework": "red_blue",
  "red_team": {
    "attacks": ["..."],
    "impact": ["..."]
  },
  "blue_team": {
    "mitigations": ["..."],
    "residual_risks": ["..."]
  },
  "observer": {
    "top_risks": ["..."],
    "recommendations": ["..."],
    "missing_info": ["..."]
  }
}

## Pre-mortem (lite)

USER:
Plan: {{plan}}
Context: {{context}}

Output JSON schema:
{
  "framework": "pre_mortem",
  "failures": [
    {
      "scenario": "...",
      "likelihood": "low|medium|high",
      "impact": "...",
      "signals": ["..."],
      "mitigations": ["..."]
    }
  ],
  "top_risks": ["..."],
  "missing_info": ["..."]
}

## Six Hats (lite)

USER:
Decision: {{decision}}
Context: {{context}}

Output JSON schema:
{
  "framework": "six_hats",
  "white": ["facts", "..."],
  "red": ["feelings", "..."],
  "black": ["risks", "..."],
  "yellow": ["benefits", "..."],
  "green": ["ideas", "..."],
  "blue": ["process", "..."],
  "synthesis": {
    "decision": "...",
    "tradeoffs": ["..."],
    "next_steps": ["..."],
    "missing_info": ["..."]
  }
}

## Studio Critique (lite)

USER:
Work: {{work}}
Goals: {{goals}}
Context: {{context}}

Output JSON schema:
{
  "framework": "studio_critique",
  "peers": [
    {
      "peer": "P1",
      "observations": ["..."],
      "questions": ["..."],
      "suggestions": ["..."]
    }
  ],
  "instructor": {
    "summary": "...",
    "focus_areas": ["..."],
    "next_steps": ["..."],
    "missing_info": ["..."]
  }
}
