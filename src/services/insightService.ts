/**
 * Insight Service
 * 
 * Orchestrates rule evaluation and optional AI reasoning.
 * This is the main entry point for the insight system.
 */

import { evaluateAllRules, InsightTrigger } from './insightRulesEngine';
import { generateExplanation } from './insightReasoning';
import { supabase } from '@/integrations/supabase/client';

export interface InsightRecord {
  id: string;
  insight_type: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  summary: string;
  explanation: string | null;
  affected_user_ids: string[];
  affected_roles?: string[];
  summary_data: Record<string, any>;
  is_ai_enhanced: boolean;
  created_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
}

/**
 * Process insights: evaluate rules, optionally enhance with AI, and save to database
 * 
 * @param enableAI - Whether to use AI reasoning (default: false)
 * @returns Array of created insight records
 */
export async function processInsights(enableAI: boolean = false): Promise<InsightRecord[]> {
  try {
    // Step 1: Evaluate all rules (pure logic, no AI)
    const triggeredInsights = await evaluateAllRules();

    if (triggeredInsights.length === 0) {
      return [];
    }

    // Step 2: Optionally enhance with AI explanations
    const enhancedInsights = await Promise.all(
      triggeredInsights.map(async (insight) => {
        let explanation: string | null = null;
        let isAIEnhanced = false;

        if (enableAI) {
          explanation = await generateExplanation({
            insight_type: insight.insight_type,
            severity: insight.severity,
            title: insight.title,
            summary: insight.summary,
            summary_data: insight.summary_data,
          });
          isAIEnhanced = !!explanation;
        }

        return {
          ...insight,
          explanation,
          is_ai_enhanced: isAIEnhanced,
        };
      })
    );

    // Step 3: Check for duplicates (don't create if similar insight exists in last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: recentInsights } = await supabase
      .from('insights')
      .select('insight_type, created_at')
      .gte('created_at', oneDayAgo.toISOString())
      .is('acknowledged_at', null); // Only check unacknowledged

    const recentTypes = new Set(recentInsights?.map(i => i.insight_type) || []);

    // Step 4: Insert new insights (skip if duplicate type exists)
    const insightsToInsert = enhancedInsights.filter(
      insight => !recentTypes.has(insight.insight_type)
    );

    if (insightsToInsert.length === 0) {
      return [];
    }

    const { data: insertedInsights, error } = await supabase
      .from('insights')
      .insert(
        insightsToInsert.map(insight => ({
          insight_type: insight.insight_type,
          severity: insight.severity,
          title: insight.title,
          summary: insight.summary,
          explanation: insight.explanation,
          affected_user_ids: insight.affected_user_ids,
          affected_roles: insight.affected_roles || [],
          summary_data: insight.summary_data,
          is_ai_enhanced: insight.is_ai_enhanced,
        }))
      )
      .select();

    if (error) {
      console.error('Error inserting insights:', error);
      throw error;
    }

    return (insertedInsights || []) as InsightRecord[];
  } catch (error) {
    console.error('Error processing insights:', error);
    throw error;
  }
}

/**
 * Fetch insights from database
 * 
 * @param limit - Maximum number of insights to fetch (default: 50)
 * @param includeAcknowledged - Whether to include acknowledged insights (default: false)
 */
export async function fetchInsights(
  limit: number = 50,
  includeAcknowledged: boolean = false
): Promise<InsightRecord[]> {
  try {
    let query = supabase
      .from('insights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!includeAcknowledged) {
      query = query.is('acknowledged_at', null);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []) as InsightRecord[];
  } catch (error) {
    console.error('Error fetching insights:', error);
    throw error;
  }
}

/**
 * Acknowledge an insight (mark as read)
 * 
 * @param insightId - ID of the insight to acknowledge
 * @param userId - ID of the user acknowledging (should be admin)
 */
export async function acknowledgeInsight(insightId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('insights')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: userId,
      })
      .eq('id', insightId);

    if (error) throw error;
  } catch (error) {
    console.error('Error acknowledging insight:', error);
    throw error;
  }
}

/**
 * Get insight statistics
 */
export async function getInsightStats(): Promise<{
  total: number;
  unacknowledged: number;
  by_severity: { low: number; medium: number; high: number };
  by_type: Record<string, number>;
}> {
  try {
    const { data: allInsights } = await supabase
      .from('insights')
      .select('severity, insight_type, acknowledged_at');

    if (!allInsights) {
      return {
        total: 0,
        unacknowledged: 0,
        by_severity: { low: 0, medium: 0, high: 0 },
        by_type: {},
      };
    }

    const unacknowledged = allInsights.filter(i => !i.acknowledged_at).length;
    const bySeverity = {
      low: allInsights.filter(i => i.severity === 'low').length,
      medium: allInsights.filter(i => i.severity === 'medium').length,
      high: allInsights.filter(i => i.severity === 'high').length,
    };

    const byType: Record<string, number> = {};
    allInsights.forEach(insight => {
      byType[insight.insight_type] = (byType[insight.insight_type] || 0) + 1;
    });

    return {
      total: allInsights.length,
      unacknowledged,
      by_severity: bySeverity,
      by_type: byType,
    };
  } catch (error) {
    console.error('Error getting insight stats:', error);
    return {
      total: 0,
      unacknowledged: 0,
      by_severity: { low: 0, medium: 0, high: 0 },
      by_type: {},
    };
  }
}

