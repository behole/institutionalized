# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### Please Do Not

- Open a public GitHub issue for security vulnerabilities
- Discuss the vulnerability in public forums or social media

### Please Do

1. **Email the maintainers** with details about the vulnerability
2. **Provide a clear description** of the issue and its potential impact
3. **Include steps to reproduce** if possible
4. **Wait for confirmation** before publicly disclosing

### What to Include

- Type of vulnerability
- Affected framework(s) or component(s)
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: Immediate (hours to days)
  - High: Within 1 week
  - Medium: Within 2 weeks
  - Low: Next release cycle

## Security Considerations

### LLM API Keys

- **Never commit API keys** to the repository
- Use environment variables for all API keys
- See [.env.example](.env.example) for proper configuration
- API keys are never logged or stored by this library

### Prompt Injection

- This library passes user input to LLMs
- **Always validate and sanitize** user input before processing
- Framework implementations include basic validation
- For production use, implement additional security layers

### Data Privacy

- LLM providers may log prompts and responses
- **Never send sensitive data** to LLM APIs
- Review your LLM provider's data retention policies
- Consider using self-hosted models for sensitive use cases

### Dependencies

- Dependabot automatically checks for vulnerable dependencies
- We aim to keep all dependencies up to date
- Review dependency updates before merging

## Best Practices

### For Users

1. Keep your API keys secure
2. Validate user input before passing to frameworks
3. Review LLM outputs before acting on them
4. Use appropriate rate limiting in production
5. Monitor API usage and costs

### For Contributors

1. Never commit secrets or API keys
2. Use TypeScript strict mode
3. Validate all user inputs
4. Write tests for security-critical code
5. Follow the principle of least privilege

## Known Limitations

### LLM Security

- LLMs can be manipulated through prompt injection
- Outputs should not be blindly trusted
- This library does not prevent all prompt injection attacks
- Users must implement application-level security

### Framework-Specific Risks

- **Adversarial frameworks** (courtroom, red-blue-team): May generate offensive arguments
- **Consensus frameworks** (jury, parliament): May amplify biases in training data
- **Pre-mortem/post-mortem**: May surface sensitive failure scenarios

Always review outputs before acting on them.

## Attribution

If you discover a security issue and would like to be credited, we will acknowledge your contribution in the fix release notes (with your permission).

## Updates

This security policy may be updated over time. Check back periodically for changes.

---

Last updated: 2026-01-30
