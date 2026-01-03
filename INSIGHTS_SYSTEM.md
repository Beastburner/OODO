# Automated Insight & Reasoning System

## Overview

This system provides automated insights and notifications based on HR data patterns, without modifying any core HR logic. It consists of three main layers:

1. **Insight Rules Engine** (Mandatory, Non-AI)
2. **Insight Reasoning Layer** (Optional, AI-Assisted)
3. **Insight Delivery Layer** (Dashboard & Notifications)

## Architecture

### 1. Insight Rules Engine (`src/services/insightRulesEngine.ts`)

Pure rule-based logic that evaluates HR data and generates insights. **No AI is used here** - all rules are deterministic and explainable.

**Implemented Rules:**
- **Leave Approval Delay**: Detects pending leave requests older than 24 hours
- **Late Check-in Pattern**: Identifies employees with 3+ late arrivals in 30 days
- **HR Inactivity**: Detects gaps in HR approval activity (>48 hours)
- **Approval Pattern**: Flags unusual approval/rejection patterns (all approved/rejected, extreme bias)
- **Overtime Increase**: Detects week-over-week increase in late clock-outs

### 2. Insight Reasoning Layer (`src/services/insightReasoning.ts`)

Optional AI-assisted layer that converts structured insights into human-readable explanations using Google's Gemini API.

**Important:**
- AI is used **only for explanation/summarization**
- **No decisions are made by AI**
- System works without AI (rules engine is independent)
- Set `VITE_GEMINI_API_KEY` environment variable to enable

### 3. Insight Service (`src/services/insightService.ts`)

Orchestrates rule evaluation and reasoning. Handles:
- Processing insights (rule evaluation + optional AI enhancement)
- Fetching insights from database
- Acknowledging insights
- Statistics generation

### 4. Insight Observer (`src/services/insightObserver.ts`)

Sets up real-time subscriptions to HR events using Supabase real-time:
- Watches `leave_requests` table for status changes
- Watches `attendance` table for clock in/out events
- Watches `payroll` table for updates
- Debounces processing to avoid excessive API calls

## Database Schema

The system uses a new `insights` table (see migration: `supabase/migrations/20260103150000_insights_system.sql`):

```sql
CREATE TABLE public.insights (
  id UUID PRIMARY KEY,
  insight_type insight_type NOT NULL,
  severity insight_severity NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  explanation TEXT, -- Optional AI-generated
  affected_user_ids UUID[],
  affected_roles TEXT[],
  summary_data JSONB,
  is_ai_enhanced BOOLEAN,
  created_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID
);
```

## Usage

### For Developers

1. **Manual Processing:**
   ```typescript
   import { processInsights } from '@/services/insightService';
   
   // Rule-based only (no AI)
   await processInsights(false);
   
   // With AI enhancement
   await processInsights(true);
   ```

2. **Fetch Insights:**
   ```typescript
   import { fetchInsights } from '@/services/insightService';
   const insights = await fetchInsights(50, false);
   ```

3. **React Hook:**
   ```typescript
   import { useInsights } from '@/hooks/useInsights';
   
   const { insights, stats, acknowledge, triggerProcessing } = useInsights();
   ```

### For Admins

1. **View Insights:**
   - Navigate to Dashboard (admin view)
   - Insights panel appears at the top
   - View unread insights with severity indicators

2. **Process Insights:**
   - Click "Process" button in Insights panel
   - System evaluates all rules and generates new insights
   - Duplicate insights (same type within 24h) are filtered

3. **Acknowledge Insights:**
   - Click checkmark icon on any insight
   - Marks insight as read
   - Acknowledged insights are filtered from default view

## Configuration

### Environment Variables

- `VITE_GEMINI_API_KEY` (optional): Google Gemini API key for AI-enhanced explanations
  - If not set, system works in rule-based mode only
  - Get API key from: https://makersuite.google.com/app/apikey

### Rule Thresholds

Thresholds can be adjusted in `src/services/insightRulesEngine.ts`:

- `DELAY_THRESHOLD_HOURS`: Leave approval delay threshold (default: 24)
- `LATE_THRESHOLD_DAYS`: Period for late check-in analysis (default: 30)
- `LATE_COUNT_THRESHOLD`: Minimum late arrivals to flag (default: 3)
- `INACTIVITY_THRESHOLD_HOURS`: HR inactivity threshold (default: 48)
- `PATTERN_CHECK_DAYS`: Approval pattern analysis period (default: 7)

## Integration Points

The system integrates with existing HR workflows through:

1. **Database Queries**: Reads from existing tables (`leave_requests`, `attendance`, `payroll`)
2. **Real-time Subscriptions**: Observes changes via Supabase real-time
3. **Dashboard UI**: Adds Insights panel to AdminDashboard component

**No modifications to existing HR logic are required.**

## File Structure

```
src/
├── services/
│   ├── insightRulesEngine.ts    # Rule-based evaluation logic
│   ├── insightReasoning.ts      # Optional AI reasoning
│   ├── insightService.ts        # Main orchestration service
│   ├── insightObserver.ts       # Real-time event observers
│   └── README.md                # Service documentation
├── hooks/
│   └── useInsights.ts           # React hook for insights
├── components/
│   ├── dashboard/
│   │   └── InsightsPanel.tsx    # Dashboard insights UI
│   └── InsightObserverInit.tsx  # Observer initialization
└── pages/
    └── Dashboard.tsx            # Updated to include observer init

supabase/
└── migrations/
    └── 20260103150000_insights_system.sql  # Database schema
```

## Example Insights

1. **Leave Approval Delay:**
   - "5 leave request(s) pending for more than 24 hours. Average delay: 36.5 hours."

2. **Late Check-in Pattern:**
   - "3 employee(s) have 3+ late arrivals in the last 30 days. Average: 4.2 late days per employee."

3. **HR Inactivity:**
   - "No leave request approvals/rejections for 72 hours (3 days)."

4. **Approval Pattern:**
   - "All 8 leave requests in the last 7 days were approved."

5. **Overtime Increase:**
   - "Average late clock-out time increased by 25.3% week-over-week (1.8 hours later)."

## Constraints & Design Decisions

✅ **Additive Only**: No modifications to existing HR workflows
✅ **Event-Based**: Uses observer pattern for real-time updates
✅ **Deterministic Rules**: All rule logic is explainable
✅ **Optional AI**: System works without AI (rules engine is independent)
✅ **No AI Decisions**: AI used only for explanation, not decision-making
✅ **Hackathon-Friendly**: Clear naming, comments, and structure

## Future Enhancements (Optional)

- Weekly insight summary email
- Custom rule configuration UI
- Insight history and trends
- More sophisticated rule patterns
- Batch processing for large datasets

