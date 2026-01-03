-- Create enum for insight severity
CREATE TYPE public.insight_severity AS ENUM ('low', 'medium', 'high');

-- Create enum for insight types
CREATE TYPE public.insight_type AS ENUM (
  'leave_approval_delay',
  'overtime_increase',
  'hr_inactivity',
  'approval_pattern',
  'late_checkin_pattern',
  'attendance_trend',
  'payroll_anomaly'
);

-- Create insights table
CREATE TABLE public.insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type insight_type NOT NULL,
  severity insight_severity NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  explanation TEXT, -- Optional AI-generated explanation
  affected_user_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Array of affected user IDs
  affected_roles TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of affected roles (if applicable)
  summary_data JSONB DEFAULT '{}'::JSONB, -- Structured data for the insight
  is_ai_enhanced BOOLEAN DEFAULT FALSE, -- Whether AI reasoning was applied
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ, -- When admin acknowledges the insight
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on insights table
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for insights
-- Admins can view all insights
CREATE POLICY "Admins can view all insights" ON public.insights
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert insights (for the system)
CREATE POLICY "Admins can insert insights" ON public.insights
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update insights (e.g., acknowledge)
CREATE POLICY "Admins can update insights" ON public.insights
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_insights_created_at ON public.insights(created_at DESC);
CREATE INDEX idx_insights_type ON public.insights(insight_type);
CREATE INDEX idx_insights_severity ON public.insights(severity);
CREATE INDEX idx_insights_acknowledged ON public.insights(acknowledged_at) WHERE acknowledged_at IS NULL;

