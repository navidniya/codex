# Paperclip - Clara Project Analysis

Paperclip agent team configuration for analyzing the **Clara** project. This sets up a coordinated team of 5 AI agents that systematically review your Clara project for code quality, security, testing, and documentation.

## Agent Team

| Agent | Role | Focus Area |
|-------|------|------------|
| Lead Architect | CEO | Coordinates all analysis, synthesizes findings |
| Code Reviewer | Engineer | Code quality, anti-patterns, technical debt |
| QA Analyst | QA | Test coverage, missing test cases, edge cases |
| Security Auditor | Engineer | Vulnerabilities, OWASP Top 10, dependency CVEs |
| Documentation Analyst | Content Strategist | Docs completeness, API documentation gaps |

## Quick Start

```bash
# Install and onboard Paperclip
npx paperclipai onboard --yes

# Or run directly (auto-onboards if needed)
npx paperclipai run
```

Dashboard launches at `http://localhost:3100`.

## Project Structure

```
paperclip.config.json          # Main company & agent configuration
agents/
  clara-lead/
    PERSONA.md                 # Agent identity and responsibilities
    HEARTBEAT.md               # Wake-up checklist for each cycle
  clara-code-reviewer/
    PERSONA.md
    HEARTBEAT.md
  clara-qa/
    PERSONA.md
    HEARTBEAT.md
  clara-security/
    PERSONA.md
    HEARTBEAT.md
  clara-docs/
    PERSONA.md
    HEARTBEAT.md
```

## How It Works

Each agent wakes on its heartbeat schedule, follows its checklist, performs analysis on the Clara project, and reports findings through the Paperclip dashboard. The Lead Architect coordinates the team, prioritizes work, and synthesizes findings into actionable reports.

Agents are configured to use Claude via the `claude_local` adapter. You can swap to Codex, OpenCode, or any OpenRouter model by changing the `adapterConfig` in `paperclip.config.json`.

## Budget

Total monthly budget: **$140 USD** with per-agent caps to prevent runaway costs.

## Learn More

- [Paperclip GitHub](https://github.com/paperclipai/paperclip)
- [Paperclip Docs](https://paperclip.ing/)
