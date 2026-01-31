# CI/CD Setup

Complete continuous integration and deployment infrastructure for the Institutional Reasoning library.

## 📋 Overview

The CI/CD system automates:
- **Testing** on every pull request
- **Type checking** for TypeScript correctness
- **E2E validation** on main branch
- **Release automation** for tagged versions
- **Dependency updates** via Dependabot

## 🔧 GitHub Actions Workflows

### Test Workflow (`.github/workflows/test.yml`)

Runs on every PR and push to main:

**Unit Tests Job:**
- ✅ Runs on all PRs and pushes
- ✅ Installs dependencies with Bun
- ✅ Type checks entire codebase
- ✅ Runs unit tests (fast, < 1s)
- ✅ Fails PR if tests fail

**E2E Tests Job:**
- ✅ Runs only on main branch pushes
- ✅ Requires `ANTHROPIC_API_KEY` secret
- ✅ Runs E2E tests with real LLM calls
- ✅ Continues on error (LLM tests can be flaky)

### Release Workflow (`.github/workflows/release.yml`)

Runs when a version tag is pushed (e.g., `v0.1.0`):

- ✅ Runs all quality checks
- ✅ Builds MCP server binary
- ✅ Creates GitHub release
- ✅ Attaches build artifacts
- ✅ Auto-generates release notes

## 🤖 Dependabot Configuration

Automatically checks for dependency updates weekly:

- **npm dependencies** grouped by provider (Anthropic, OpenAI, dev dependencies)
- **GitHub Actions** kept up to date
- Max 10 PRs for npm, 5 for Actions
- Weekly schedule

## 📝 Templates

### Pull Request Template

Guides contributors through:
- Change description
- Type of change (bug fix, new framework, enhancement)
- Framework-specific checklist
- Testing requirements
- Self-review checklist

### Issue Templates

**Bug Report:**
- Framework affected
- Reproduction steps
- Environment details
- Error logs

**Feature Request:**
- Type (new framework, enhancement, etc.)
- Real-world institution inspiration
- Use case description
- Example usage

## 🔐 Security Policy (`SECURITY.md`)

Documents:
- Supported versions
- Vulnerability reporting process
- Security considerations (API keys, prompt injection, data privacy)
- Best practices for users and contributors
- Known limitations

## 🚀 Setup Instructions

### For Repository Maintainers

1. **Add Secrets to GitHub:**
   ```
   Settings → Secrets and variables → Actions → New repository secret

   Name: ANTHROPIC_API_KEY
   Value: sk-ant-...
   ```

2. **Enable GitHub Actions:**
   ```
   Settings → Actions → General → Allow all actions
   ```

3. **Enable Dependabot:**
   ```
   Settings → Code security → Dependabot → Enable
   ```

4. **Configure Branch Protection (recommended):**
   ```
   Settings → Branches → Add rule for 'main':
   - Require status checks before merging
   - Require 'Unit Tests' to pass
   - Require up-to-date branches
   ```

### For Contributors

1. **Create a fork**
2. **Make changes in a feature branch**
3. **Push and create a PR**
4. **Wait for CI checks to pass**
5. **Address any feedback**

## 📊 CI/CD Metrics

- **Test Execution Time:**
  - Unit tests: < 1 second
  - E2E tests: ~40s per test
  - Full test suite: ~3 minutes

- **Workflows:**
  - Test workflow: Runs ~10-20 times/day (typical)
  - Release workflow: On-demand (tags)

- **Coverage:**
  - Unit tests: 32 tests across 2 files
  - E2E tests: 3 tests, 1 validated
  - Total: 35 tests, 71+ assertions

## 🔄 Release Process

To create a new release:

1. **Update version in package.json:**
   ```bash
   # Edit package.json version field
   ```

2. **Commit and push:**
   ```bash
   git add package.json
   git commit -m "chore: bump version to v0.2.0"
   git push
   ```

3. **Create and push tag:**
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

4. **GitHub Actions will:**
   - Run all tests
   - Build artifacts
   - Create GitHub release
   - Attach MCP server binary

## 🎯 Next Steps

- [ ] Add npm publish step to release workflow
- [ ] Add E2E tests for remaining 17 frameworks
- [ ] Add code coverage reporting
- [ ] Add performance benchmarks
- [ ] Set up status badges in README

## 🔍 Troubleshooting

### "Test failed" on PR

- Check the Actions tab for detailed logs
- Run tests locally: `bun test:unit`
- Ensure TypeScript compiles: `bun typecheck`

### "E2E tests failing" on main

- E2E tests are flaky due to LLM variability
- Check if API key is valid
- Re-run the workflow if it's a transient failure

### "Dependabot PRs failing"

- Check if breaking changes in dependencies
- Review the upgrade guide for each package
- Test locally before merging

---

**Status**: ✅ Complete
**Last Updated**: 2026-01-30
**Maintainer**: Check STATUS.md for project status
