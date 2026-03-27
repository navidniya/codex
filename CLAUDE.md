# Clara Project Analysis - Paperclip Configuration

This repository contains the Paperclip agent team configuration for analyzing the Clara project.

## Setup

### Prerequisites
- Node.js 20+
- pnpm 9.15+

### Quick Start

```bash
npx paperclipai onboard --yes
```

This will walk through interactive setup, generate secrets, and start the Paperclip server.

### Manual Start

```bash
pnpm install
npx paperclipai run
```

The dashboard launches at `http://localhost:3100`.

## Agent Team

| Agent | Role | Responsibility |
|-------|------|----------------|
| **Lead Architect** | CEO | Coordinates analysis, prioritizes tasks, synthesizes findings |
| **Code Reviewer** | Engineer | Reviews code quality, identifies anti-patterns and tech debt |
| **QA Analyst** | QA | Analyzes test coverage, proposes new test cases |
| **Security Auditor** | Engineer | Scans for vulnerabilities, OWASP Top 10, dependency CVEs |
| **Documentation Analyst** | Content Strategist | Audits docs completeness, identifies gaps |

## Configuration

- `paperclip.config.json` - Main agent team and company configuration
- `agents/` - Per-agent persona prompts and heartbeat checklists

## Working with the Clara Project

Point each agent at the Clara project repository by setting the project path during onboarding or in the adapter config. Each agent wakes on its heartbeat schedule, checks assigned tasks, performs analysis, and reports findings back through the Paperclip dashboard.

## Budget

Total monthly budget: **$140 USD** across all agents. Each agent has individual caps to prevent runaway costs.
