# Experiment Designer 🧪

A comprehensive, interactive web application for designing, planning, and documenting controlled experiments. Built for engineers and data scientists to streamline the experimentation process from design to analysis.

## Features

### Complete 8-Step Wizard

1. **Experiment Type Selection** - Choose from A/B tests, cluster randomization, switchback, causal inference, factorial design, and multi-armed bandits
2. **Metrics Selection** - Define primary, secondary, and guardrail metrics with common templates
3. **Sample Size Calculator** - Calculate required sample size with real-time power analysis
4. **Randomization Strategy** - Configure randomization unit, bucketing strategy, and stratification
5. **Variance Reduction** - Apply CUPED, post-stratification, matched pairs, and blocking techniques
6. **Risk Assessment** - Evaluate risks, define mitigation strategies, and pre-launch checklist
7. **Monitoring & Stopping Rules** - Set up monitoring, stopping rules, and decision criteria
8. **Summary & Export** - Generate comprehensive experiment documentation in Markdown or JSON

### Key Capabilities

- **Statistical Engine**: Accurate sample size calculations for binary, continuous, and count metrics
- **Power Analysis**: Real-time power curve visualization and MDE sensitivity analysis
- **Duration Estimation**: Calculate experiment duration based on traffic
- **Experiment Templates**: Pre-configured templates for 6 experiment types
- **Common Metrics Library**: 14+ pre-defined metrics with typical baselines and variances
- **Document Generation**: Auto-generate experiment design documents
- **Local Storage**: Automatically save draft experiments
- **Modern UI**: Clean, responsive design with Tailwind CSS

## Tech Stack

- **Frontend**: React 18.3 + TypeScript 5.6
- **Build Tool**: Vite 6.0
- **Styling**: Tailwind CSS 3.4
- **State Management**: Zustand 5.0 (with persistence)
- **Statistics**: jStat 1.9
- **Forms**: React Hook Form 7.54 + Zod 3.23
- **Charts**: Recharts 2.15

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at **http://localhost:5173/**

## AI Chat Security (Vercel)

The `/api/chat` endpoint supports server-side hardening controls:

- Required:
  - `OPENAI_API_KEY`
- Optional authentication:
  - `CHAT_BASIC_AUTH_USER`
  - `CHAT_BASIC_AUTH_PASS`
  - `CHAT_SESSION_SECRET` (recommended; falls back to `OPENAI_API_KEY` if unset)
  - `CHAT_SESSION_TTL_SEC` (default `3600`)
  - `CHAT_SESSION_COOKIE_NAME` (default `chat_session`)
- Optional rate limiting:
  - `CHAT_RATE_LIMIT_MAX` (default `30`)
  - `CHAT_RATE_LIMIT_WINDOW_SEC` (default `60`)
  - For distributed/serverless-safe limits, set:
    - `UPSTASH_REDIS_REST_URL`
    - `UPSTASH_REDIS_REST_TOKEN`
- Optional request guardrails:
  - `CHAT_ALLOWED_ORIGINS` (comma-separated list)
  - `CHAT_OPENAI_TIMEOUT_MS` (default `20000`)
  - `CHAT_MAX_BODY_BYTES`
  - `CHAT_MAX_MESSAGES`
  - `CHAT_MAX_MESSAGE_CHARS`
  - `CHAT_MAX_TOTAL_CHARS`
  - `CHAT_MAX_TOOLS`

When auth is enabled, the frontend can unlock chat by calling `/api/chat-auth` once with credentials.
The server sets an HttpOnly signed session cookie, and `/api/chat` accepts that cookie.

## Usage

1. **Select Experiment Type**: Choose the experiment methodology that fits your use case
2. **Define Metrics**: Add metrics you'll track (conversion rate, revenue, engagement, etc.)
3. **Calculate Sample Size**: Configure statistical parameters (α, power, MDE) and get sample size
4. **Configure Settings**: Set up randomization, variance reduction, and risk mitigation
5. **Export Documentation**: Download a complete experiment design document

## Project Structure

```
src/
├── components/          # React components
│   ├── common/         # Reusable UI components (Button, Input, etc.)
│   ├── layout/         # Layout components (Header, Footer)
│   └── wizard/         # Wizard container and 8 step components
├── lib/                # Core logic
│   ├── statistics/     # Sample size, power analysis, MDE calculations
│   ├── experimentTemplates/  # Experiment type templates
│   ├── metrics/        # Common metric definitions
│   └── export/         # Document generation
├── store/              # Zustand state management
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── constants/          # Constants and defaults
└── utils/              # Utility functions
```

## Experiment Types Supported

- **A/B Test**: Standard two-variant comparison
- **Cluster Randomized**: Randomize by groups (cities, stores)
- **Switchback**: Alternate treatments over time
- **Causal Inference**: Quasi-experimental methods (DiD, RDD, IV)
- **Factorial Design**: Test multiple factors simultaneously
- **Multi-Armed Bandit**: Dynamic traffic allocation

## Statistical Methods

- Two-sample t-test for continuous metrics
- Proportions test for binary metrics
- Poisson approximation for count metrics
- Power analysis and sensitivity analysis
- Multiple testing correction (Bonferroni, Benjamini-Hochberg)
- CUPED variance reduction

## Features in Detail

### Sample Size Calculator
- Real-time calculation as you adjust parameters
- Supports binary, continuous, and count metrics
- Handles unequal traffic allocation
- Adjusts for multiple variants
- Provides warnings for edge cases

### Variance Reduction
- **CUPED**: Reduce variance by 30-50% using pre-experiment data
- **Post-Stratification**: Balance groups on key variables
- **Matched Pairs**: Pair similar units before randomization
- **Blocking**: Randomize within homogeneous blocks

### Risk Assessment
- Pre-launch checklist with 5 required items
- Risk level evaluation (High/Medium/Low)
- Blast radius calculation
- Rollback triggers and circuit breakers

### Document Export
- **Markdown**: Complete experiment design document
- **JSON**: Machine-readable configuration
- **Clipboard**: Quick copy for sharing
- Includes all parameters, assumptions, and warnings

## License

MIT

## Acknowledgments

- Statistical formulas validated against [Evan Miller's A/B Testing Tools](https://www.evanmiller.org/ab-testing/)
- Experiment design principles from "Trustworthy Online Controlled Experiments" by Kohavi, Tang, and Xu

---

Built with ❤️ for engineers and data scientists
