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
  const [tableExists, setTableExists] = useState<boolean | null>(null);
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
      setTableExists(true); // Table exists if we got data
    } catch (error: any) {
      // Track if table doesn't exist - check this FIRST before any logging
      // Check error message, code, and custom flag
      const errorMsg = error?.message || '';
      const isTableMissing = error?.code === '42P01' || 
                            error?.isTableMissing === true ||
                            errorMsg === 'TABLE_MISSING' ||
                            errorMsg.includes('schema cache') || 
                            errorMsg.includes('Insights table does not exist');
      
      if (isTableMissing) {
        setTableExists(false);
        setLoading(false);
        // Return silently - no console.error, no toast
        return;
      }
      
      // Only log and show errors for other issues (not table missing)
      console.error('Error fetching insights:', error);
      
      // More specific error messages for other errors
      let errorMessage = 'Failed to fetch insights';
      if (error?.code === '42501') {
        // Permission denied
        errorMessage = 'Permission denied. Admin access required.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setTableExists(true); // Table exists but there's another error
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
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      // Track if table doesn't exist
      if (error?.code === '42P01' || 
          error?.isTableMissing ||
          error?.message?.includes('schema cache') || 
          error?.message?.includes('Insights table does not exist')) {
        setTableExists(false);
      }
      // Silently fail - stats will be null
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
    tableExists,
    acknowledge,
    triggerProcessing,
    refetch: fetchInsightsData,
    refetchStats: fetchStats,
  };
}

