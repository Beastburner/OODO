/**
 * Insight Observer Service
 * 
 * Sets up Supabase real-time subscriptions to observe HR events
 * and trigger insight processing when relevant changes occur.
 * 
 * This uses an observer pattern to watch for changes without
 * modifying existing HR workflows.
 */

import { supabase } from '@/integrations/supabase/client';
import { processInsights } from './insightService';

// Debounce function to avoid processing too frequently
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Debounced insight processing (wait 5 seconds after last event)
const debouncedProcessInsights = debounce(async () => {
  try {
    // Process insights without AI (faster, rule-based only)
    await processInsights(false);
  } catch (error) {
    console.error('Error in debounced insight processing:', error);
  }
}, 5000);

/**
 * Initialize event observers
 * Sets up real-time subscriptions to HR data changes
 */
export function initializeInsightObservers() {
  console.log('Initializing insight observers...');

  // Watch for leave request updates (approvals/rejections)
  const leaveRequestsChannel = supabase
    .channel('leave_requests_changes')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'leave_requests',
      },
      (payload) => {
        console.log('Leave request change detected:', payload.eventType);
        // Only trigger on status changes (approvals/rejections)
        if (payload.eventType === 'UPDATE') {
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          if (newRecord.status !== oldRecord.status) {
            debouncedProcessInsights();
          }
        } else if (payload.eventType === 'INSERT') {
          // New leave request created
          debouncedProcessInsights();
        }
      }
    )
    .subscribe();

  // Watch for attendance changes (clock in/out, status changes)
  const attendanceChannel = supabase
    .channel('attendance_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'attendance',
      },
      (payload) => {
        console.log('Attendance change detected:', payload.eventType);
        debouncedProcessInsights();
      }
    )
    .subscribe();

  // Watch for payroll updates
  const payrollChannel = supabase
    .channel('payroll_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'payroll',
      },
      (payload) => {
        console.log('Payroll change detected:', payload.eventType);
        debouncedProcessInsights();
      }
    )
    .subscribe();

  // Return cleanup function
  return () => {
    console.log('Cleaning up insight observers...');
    supabase.removeChannel(leaveRequestsChannel);
    supabase.removeChannel(attendanceChannel);
    supabase.removeChannel(payrollChannel);
  };
}

/**
 * Process insights on a schedule (e.g., daily)
 * This can be called by a cron job or scheduled task
 */
export async function scheduledInsightProcessing() {
  try {
    console.log('Running scheduled insight processing...');
    // Process with AI disabled for scheduled runs (faster, cheaper)
    await processInsights(false);
    console.log('Scheduled insight processing completed');
  } catch (error) {
    console.error('Error in scheduled insight processing:', error);
  }
}

