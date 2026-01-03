# Insight System Services

This directory contains the Automated Insight & Reasoning System services.

## Architecture

The system is built with three main layers:

1. **Insight Rules Engine** (`insightRulesEngine.ts`)
   - Pure rule-based logic (no AI)
   - Deterministic and explainable
   - Evaluates HR data patterns and generates insight triggers

2. **Insight Reasoning Layer** (`insightReasoning.ts`)
   - Optional AI-assisted explanation generation
   - Uses Gemini API (if configured)
   - Converts structured insights into human-readable text
   - **No decision-making** - only summarization

3. **Insight Service** (`insightService.ts`)
   - Orchestrates rule evaluation and reasoning
   - Manages database operations (fetch, acknowledge)
   - Handles deduplication logic

4. **Insight Observer** (`insightObserver.ts`)
   - Sets up real-time subscriptions to HR events
   - Triggers insight processing on relevant changes
   - Uses debouncing to avoid excessive processing

## Rules Implemented

1. **Leave Approval Delay**: Detects pending leave requests older than threshold
2. **Late Check-in Pattern**: Identifies employees with repeated late arrivals
3. **HR Inactivity**: Detects gaps in HR approval activity
4. **Approval Pattern**: Flags unusual approval/rejection patterns
5. **Overtime Increase**: Detects week-over-week increase in late clock-outs

## Usage

```typescript
import { processInsights, fetchInsights } from '@/services/insightService';

// Process insights (rule-based only)
await processInsights(false);

// Process insights with AI enhancement
await processInsights(true);

// Fetch insights
const insights = await fetchInsights(50, false);
```

## Configuration

- Set `VITE_GEMINI_API_KEY` environment variable to enable AI reasoning
- Rules thresholds can be adjusted in `insightRulesEngine.ts`

## Important Notes

- This system does NOT modify existing HR workflows
- All code is additive and separate from core HR logic
- Rules are deterministic and explainable (no black-box AI decisions)
- AI is used only for explanation/summarization, not decision-making

