/**
 * useInsights Hook
 * 
 * React hook for fetching and managing insights
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchInsights,
  acknowledgeInsight,
  processInsights,
  getInsightStats,
  InsightRecord,
} from '@/services/insightService';
import { useToast } from '@/hooks/use-toast';

export function useInsights() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [insights, setInsights] = useState<InsightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    total: number;
    unacknowledged: number;
    by_severity: { low: number; medium: number; high: number };
    by_type: Record<string, number>;
  } | null>(null);

  const isAdmin = role === 'admin';

  // Fetch insights
  const fetchInsightsData = async (includeAcknowledged: boolean = false) => {
    if (!isAdmin) return;

    try {
      setLoading(true);
      const data = await fetchInsights(50, includeAcknowledged);
      setInsights(data);
    } catch (error: any) {
      console.error('Error fetching insights:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch insights',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    if (!isAdmin) return;

    try {
      const statsData = await getInsightStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Acknowledge insight
  const acknowledge = async (insightId: string) => {
    if (!user || !isAdmin) return;

    try {
      await acknowledgeInsight(insightId, user.id);
      await fetchInsightsData();
      await fetchStats();
      toast({
        title: 'Insight Acknowledged',
        description: 'The insight has been marked as read.',
      });
    } catch (error: any) {
      console.error('Error acknowledging insight:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to acknowledge insight',
        variant: 'destructive',
      });
    }
  };

  // Manually trigger insight processing (for admin)
  const triggerProcessing = async (enableAI: boolean = false) => {
    if (!isAdmin) return;

    try {
      toast({
        title: 'Processing Insights',
        description: 'Evaluating HR data patterns...',
      });

      const newInsights = await processInsights(enableAI);

      if (newInsights.length > 0) {
        toast({
          title: 'New Insights Generated',
          description: `${newInsights.length} new insight(s) have been generated.`,
        });
      } else {
        toast({
          title: 'No New Insights',
          description: 'No new patterns detected at this time.',
        });
      }

      await fetchInsightsData();
      await fetchStats();
    } catch (error: any) {
      console.error('Error processing insights:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process insights',
        variant: 'destructive',
      });
    }
  };

  // Initial load
  useEffect(() => {
    if (isAdmin) {
      fetchInsightsData();
      fetchStats();
    }
  }, [user, role]);

  return {
    insights,
    stats,
    loading,
    acknowledge,
    triggerProcessing,
    refetch: fetchInsightsData,
    refetchStats: fetchStats,
  };
}

