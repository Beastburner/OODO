/**
 * Insight Rules Engine
 * 
 * Pure rule-based logic for detecting patterns in HR data.
 * This module is deterministic and explainable - no AI is used here.
 * 
 * Rules evaluate HR events and generate INSIGHT_TRIGGERED events.
 */

import { supabase } from '@/integrations/supabase/client';

// Types for insight data
export type InsightSeverity = 'low' | 'medium' | 'high';
export type InsightType = 
  | 'leave_approval_delay'
  | 'overtime_increase'
  | 'hr_inactivity'
  | 'approval_pattern'
  | 'late_checkin_pattern'
  | 'attendance_trend'
  | 'payroll_anomaly';

export interface InsightTrigger {
  insight_type: InsightType;
  severity: InsightSeverity;
  title: string;
  summary: string;
  affected_user_ids: string[];
  affected_roles?: string[];
  summary_data: Record<string, any>;
}

interface LeaveRequest {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface AttendanceRecord {
  user_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: 'present' | 'late' | 'absent' | 'half_day';
}

/**
 * Rule 1: Leave Approval Delay
 * Detects when leave requests take longer than expected to be approved/rejected
 */
async function checkLeaveApprovalDelay(): Promise<InsightTrigger | null> {
  const DELAY_THRESHOLD_HOURS = 24; // 24 hours threshold

  try {
    // Get pending leave requests older than threshold
    const thresholdTime = new Date();
    thresholdTime.setHours(thresholdTime.getHours() - DELAY_THRESHOLD_HOURS);

    const { data: pendingRequests, error } = await supabase
      .from('leave_requests')
      .select('id, user_id, created_at, status')
      .eq('status', 'pending')
      .lt('created_at', thresholdTime.toISOString());

    if (error) throw error;

    if (!pendingRequests || pendingRequests.length === 0) {
      return null;
    }

    // Calculate average delay
    const now = new Date();
    const delays = pendingRequests.map(req => {
      const created = new Date(req.created_at);
      return (now.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
    });
    const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;

    // Determine severity
    let severity: InsightSeverity = 'low';
    if (avgDelay > 72) severity = 'high';
    else if (avgDelay > 48) severity = 'medium';

    return {
      insight_type: 'leave_approval_delay',
      severity,
      title: 'Leave Approval Delays Detected',
      summary: `${pendingRequests.length} leave request(s) pending for more than ${DELAY_THRESHOLD_HOURS} hours. Average delay: ${avgDelay.toFixed(1)} hours.`,
      affected_user_ids: [...new Set(pendingRequests.map(r => r.user_id))],
      summary_data: {
        pending_count: pendingRequests.length,
        avg_delay_hours: Math.round(avgDelay * 10) / 10,
        max_delay_hours: Math.round(Math.max(...delays) * 10) / 10,
        threshold_hours: DELAY_THRESHOLD_HOURS,
      },
    };
  } catch (error) {
    console.error('Error checking leave approval delay:', error);
    return null;
  }
}

/**
 * Rule 2: Late Check-in Pattern
 * Detects employees with repeated late arrivals
 */
async function checkLateCheckinPattern(): Promise<InsightTrigger | null> {
  const LATE_THRESHOLD_DAYS = 5; // Check last 30 days
  const LATE_COUNT_THRESHOLD = 3; // 3+ late arrivals in threshold period

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: attendance, error } = await supabase
      .from('attendance')
      .select('user_id, date, status')
      .eq('status', 'late')
      .gte('date', dateStr);

    if (error) throw error;

    if (!attendance || attendance.length === 0) {
      return null;
    }

    // Count late occurrences per user
    const lateCounts: Record<string, number> = {};
    attendance.forEach(record => {
      lateCounts[record.user_id] = (lateCounts[record.user_id] || 0) + 1;
    });

    // Find users with threshold or more late arrivals
    const frequentLateUsers = Object.entries(lateCounts)
      .filter(([_, count]) => count >= LATE_COUNT_THRESHOLD)
      .map(([userId, count]) => ({ userId, count }));

    if (frequentLateUsers.length === 0) {
      return null;
    }

    const avgLateCount = frequentLateUsers.reduce((sum, u) => sum + u.count, 0) / frequentLateUsers.length;
    const maxLateCount = Math.max(...frequentLateUsers.map(u => u.count));

    let severity: InsightSeverity = 'low';
    if (maxLateCount > 8) severity = 'high';
    else if (maxLateCount > 5) severity = 'medium';

    return {
      insight_type: 'late_checkin_pattern',
      severity,
      title: 'Repeated Late Arrivals Detected',
      summary: `${frequentLateUsers.length} employee(s) have ${LATE_COUNT_THRESHOLD}+ late arrivals in the last 30 days. Average: ${avgLateCount.toFixed(1)} late days per employee.`,
      affected_user_ids: frequentLateUsers.map(u => u.user_id),
      summary_data: {
        affected_count: frequentLateUsers.length,
        avg_late_count: Math.round(avgLateCount * 10) / 10,
        max_late_count: maxLateCount,
        period_days: 30,
        threshold: LATE_COUNT_THRESHOLD,
        user_details: frequentLateUsers.map(u => ({ user_id: u.userId, late_count: u.count })),
      },
    };
  } catch (error) {
    console.error('Error checking late check-in pattern:', error);
    return null;
  }
}

/**
 * Rule 3: HR Inactivity
 * Detects when there's no HR approval activity for a long duration
 */
async function checkHRInactivity(): Promise<InsightTrigger | null> {
  const INACTIVITY_THRESHOLD_HOURS = 48; // 2 days of no activity

  try {
    const { data: recentActivity, error } = await supabase
      .from('leave_requests')
      .select('updated_at, status')
      .in('status', ['approved', 'rejected'])
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!recentActivity || recentActivity.length === 0) {
      // No approvals/rejections at all - might be high severity
      return {
        insight_type: 'hr_inactivity',
        severity: 'high',
        title: 'No HR Activity Detected',
        summary: 'No leave request approvals or rejections found in the system.',
        affected_user_ids: [],
        affected_roles: ['admin'],
        summary_data: {
          inactivity_hours: null,
          threshold_hours: INACTIVITY_THRESHOLD_HOURS,
        },
      };
    }

    const lastActivity = new Date(recentActivity[0].updated_at);
    const now = new Date();
    const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

    if (hoursSinceActivity < INACTIVITY_THRESHOLD_HOURS) {
      return null; // Activity is recent enough
    }

    let severity: InsightSeverity = 'low';
    if (hoursSinceActivity > 120) severity = 'high'; // 5 days
    else if (hoursSinceActivity > 72) severity = 'medium'; // 3 days

    return {
      insight_type: 'hr_inactivity',
      severity,
      title: 'HR Activity Gap Detected',
      summary: `No leave request approvals/rejections for ${Math.round(hoursSinceActivity)} hours (${Math.round(hoursSinceActivity / 24)} days).`,
      affected_user_ids: [],
      affected_roles: ['admin'],
      summary_data: {
        inactivity_hours: Math.round(hoursSinceActivity),
        inactivity_days: Math.round(hoursSinceActivity / 24 * 10) / 10,
        last_activity: recentActivity[0].updated_at,
        threshold_hours: INACTIVITY_THRESHOLD_HOURS,
      },
    };
  } catch (error) {
    console.error('Error checking HR inactivity:', error);
    return null;
  }
}

/**
 * Rule 4: Approval/Rejection Pattern
 * Detects unusual patterns in approvals (e.g., all rejections or all approvals)
 */
async function checkApprovalPattern(): Promise<InsightTrigger | null> {
  const PATTERN_CHECK_DAYS = 7; // Check last 7 days
  const MIN_REQUESTS_FOR_PATTERN = 5; // Need at least 5 requests to detect pattern

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - PATTERN_CHECK_DAYS);
    const dateStr = sevenDaysAgo.toISOString();

    const { data: recentRequests, error } = await supabase
      .from('leave_requests')
      .select('id, status, updated_at')
      .in('status', ['approved', 'rejected'])
      .gte('updated_at', dateStr);

    if (error) throw error;

    if (!recentRequests || recentRequests.length < MIN_REQUESTS_FOR_PATTERN) {
      return null;
    }

    const approvedCount = recentRequests.filter(r => r.status === 'approved').length;
    const rejectedCount = recentRequests.filter(r => r.status === 'rejected').length;
    const approvalRate = approvedCount / recentRequests.length;

    // Detect patterns: all approved, all rejected, or extreme bias
    let pattern: string | null = null;
    let severity: InsightSeverity = 'low';

    if (rejectedCount === 0 && approvedCount >= MIN_REQUESTS_FOR_PATTERN) {
      pattern = 'all_approved';
      severity = 'medium';
    } else if (approvedCount === 0 && rejectedCount >= MIN_REQUESTS_FOR_PATTERN) {
      pattern = 'all_rejected';
      severity = 'high';
    } else if (approvalRate > 0.9 && recentRequests.length >= MIN_REQUESTS_FOR_PATTERN) {
      pattern = 'high_approval_rate';
      severity = 'low';
    } else if (approvalRate < 0.1 && recentRequests.length >= MIN_REQUESTS_FOR_PATTERN) {
      pattern = 'high_rejection_rate';
      severity = 'medium';
    }

    if (!pattern) {
      return null;
    }

    const patternMessages: Record<string, string> = {
      all_approved: `All ${recentRequests.length} leave requests in the last ${PATTERN_CHECK_DAYS} days were approved.`,
      all_rejected: `All ${recentRequests.length} leave requests in the last ${PATTERN_CHECK_DAYS} days were rejected.`,
      high_approval_rate: `${Math.round(approvalRate * 100)}% approval rate (${approvedCount}/${recentRequests.length}) in the last ${PATTERN_CHECK_DAYS} days.`,
      high_rejection_rate: `${Math.round((1 - approvalRate) * 100)}% rejection rate (${rejectedCount}/${recentRequests.length}) in the last ${PATTERN_CHECK_DAYS} days.`,
    };

    return {
      insight_type: 'approval_pattern',
      severity,
      title: 'Unusual Approval Pattern Detected',
      summary: patternMessages[pattern],
      affected_user_ids: [],
      affected_roles: ['admin'],
      summary_data: {
        pattern_type: pattern,
        total_requests: recentRequests.length,
        approved_count: approvedCount,
        rejected_count: rejectedCount,
        approval_rate: Math.round(approvalRate * 100) / 100,
        period_days: PATTERN_CHECK_DAYS,
      },
    };
  } catch (error) {
    console.error('Error checking approval pattern:', error);
    return null;
  }
}

/**
 * Rule 5: Overtime Increase (Simplified)
 * Detects week-over-week increase in late clock-outs (indicating potential overtime)
 */
async function checkOvertimeIncrease(): Promise<InsightTrigger | null> {
  try {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay()); // Start of week
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setMilliseconds(-1);

    const thisWeekStr = thisWeekStart.toISOString().split('T')[0];
    const lastWeekStr = lastWeekStart.toISOString().split('T')[0];

    // Get clock_out times (late clock-outs suggest overtime)
    const { data: thisWeekAttendance } = await supabase
      .from('attendance')
      .select('user_id, clock_out')
      .gte('date', thisWeekStr)
      .not('clock_out', 'is', null);

    const { data: lastWeekAttendance, error: lastWeekError } = await supabase
      .from('attendance')
      .select('user_id, clock_out')
      .gte('date', lastWeekStr)
      .lt('date', thisWeekStr)
      .not('clock_out', 'is', null);

    if (lastWeekError) throw lastWeekError;

    if (!thisWeekAttendance || !lastWeekAttendance) {
      return null;
    }

    // Calculate average clock-out time (hour of day)
    const getAvgClockOutHour = (records: any[]) => {
      if (records.length === 0) return 0;
      const hours = records
        .map(r => {
          const clockOut = new Date(r.clock_out);
          return clockOut.getHours() + clockOut.getMinutes() / 60;
        })
        .filter(h => h > 17); // Only count after 5 PM
      return hours.length > 0 ? hours.reduce((a, b) => a + b, 0) / hours.length : 0;
    };

    const thisWeekAvg = getAvgClockOutHour(thisWeekAttendance);
    const lastWeekAvg = getAvgClockOutHour(lastWeekAttendance);

    if (thisWeekAvg === 0 || lastWeekAvg === 0) {
      return null;
    }

    const increase = thisWeekAvg - lastWeekAvg;
    const increasePercent = (increase / lastWeekAvg) * 100;

    if (increasePercent < 10) {
      return null; // Less than 10% increase, not significant
    }

    let severity: InsightSeverity = 'low';
    if (increasePercent > 30) severity = 'high';
    else if (increasePercent > 20) severity = 'medium';

    return {
      insight_type: 'overtime_increase',
      severity,
      title: 'Potential Overtime Increase',
      summary: `Average late clock-out time increased by ${increasePercent.toFixed(1)}% week-over-week (${increase.toFixed(1)} hours later).`,
      affected_user_ids: [],
      summary_data: {
        this_week_avg_hour: Math.round(thisWeekAvg * 10) / 10,
        last_week_avg_hour: Math.round(lastWeekAvg * 10) / 10,
        increase_hours: Math.round(increase * 10) / 10,
        increase_percent: Math.round(increasePercent * 10) / 10,
      },
    };
  } catch (error) {
    console.error('Error checking overtime increase:', error);
    return null;
  }
}

/**
 * Evaluate all rules and return triggered insights
 */
export async function evaluateAllRules(): Promise<InsightTrigger[]> {
  const results: InsightTrigger[] = [];

  // Run all rule checks in parallel
  const [
    leaveDelay,
    lateCheckin,
    hrInactivity,
    approvalPattern,
    overtimeIncrease,
  ] = await Promise.all([
    checkLeaveApprovalDelay(),
    checkLateCheckinPattern(),
    checkHRInactivity(),
    checkApprovalPattern(),
    checkOvertimeIncrease(),
  ]);

  // Collect non-null results
  if (leaveDelay) results.push(leaveDelay);
  if (lateCheckin) results.push(lateCheckin);
  if (hrInactivity) results.push(hrInactivity);
  if (approvalPattern) results.push(approvalPattern);
  if (overtimeIncrease) results.push(overtimeIncrease);

  return results;
}

