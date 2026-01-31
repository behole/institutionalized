# Institutional Reasoning Test Suite

Baseline dataset for systematic testing across all frameworks.

## Philosophy

The same decision/content can be evaluated through different institutional lenses:
- **Courtroom**: Binary decision with adversarial evaluation
- **Peer Review**: Academic validation with revision cycles
- **Red/Blue Team**: Security/reliability stress testing
- **Pre-mortem**: Failure mode identification
- **Studio Critique**: Creative work evaluation

## Test Cases

### 1. Technical Decision: API Migration
**Scenario:** Migrate REST API to GraphQL

Can be tested through:
- **Courtroom**: Should we migrate? (Yes/No with evidence)
- **Peer Review**: Review the migration proposal document
- **Red/Blue Team**: Attack the proposed GraphQL implementation
- **Pre-mortem**: Imagine migration failure scenarios
- **Studio Critique**: Not applicable (too technical, not creative)

### 2. Product Decision: Launch Timing
**Scenario:** Launch mobile app on Feb 1st vs. delay to March 1st

Can be tested through:
- **Courtroom**: Should we launch Feb 1st? (Yes/No with evidence)
- **Peer Review**: Not applicable (not a document to review)
- **Red/Blue Team**: Test readiness of the system
- **Pre-mortem**: Imagine launch failure scenarios
- **Studio Critique**: Not applicable (not creative work)

### 3. Creative Work: Essay/Article
**Scenario:** Draft essay about skateboarding culture

Can be tested through:
- **Courtroom**: Not applicable (no binary decision)
- **Peer Review**: Review the essay for publication
- **Red/Blue Team**: Not applicable (not a system)
- **Pre-mortem**: Not applicable (not a decision with future risk)
- **Studio Critique**: Critique the writing

### 4. Security Architecture
**Scenario:** Authentication system design

Can be tested through:
- **Courtroom**: Should we use this auth design? (Yes/No)
- **Peer Review**: Review the architecture document
- **Red/Blue Team**: Attack the authentication system
- **Pre-mortem**: Imagine security breach scenarios
- **Studio Critique**: Not applicable (too technical)

## Test Matrix

| Test Case | Courtroom | Peer Review | Red/Blue | Pre-mortem | Studio |
|-----------|-----------|-------------|----------|------------|--------|
| API Migration | ✓ | ✓ | ✓ | ✓ | ✗ |
| Launch Timing | ✓ | ✗ | ✓ | ✓ | ✗ |
| Essay/Article | ✗ | ✓ | ✗ | ✗ | ✓ |
| Auth System | ✓ | ✓ | ✓ | ✓ | ✗ |

## Recommended Baseline Tests

### Quick Smoke Test (5 tests)
1. **API Migration** → Courtroom
2. **Launch Timing** → Pre-mortem
3. **Essay** → Studio Critique
4. **Auth System** → Red/Blue Team
5. **Migration Proposal** → Peer Review

### Comprehensive Test (10 tests)
All of the above, plus:
6. **API Migration** → Peer Review
7. **Launch Timing** → Courtroom
8. **Auth System** → Courtroom
9. **Essay** → Peer Review
10. **API Migration** → Pre-mortem

## Running Tests

```bash
# Run full test suite
bun run test-all.ts

# Run specific framework
bun run test-suite courtroom

# Run specific test case
bun run test-case api-migration
```

## Success Criteria

- All frameworks complete without errors
- Validation catches LLM hallucination (e.g., paraphrased quotes)
- Outputs are substantive (not generic)
- Recommendations are actionable
- Different frameworks provide different insights on same input
