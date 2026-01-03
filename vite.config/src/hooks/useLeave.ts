import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface LeaveType {
  id: string;
  name: string;
  days_allowed: number;
}

interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type_id: string | null;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  leave_types?: LeaveType;
  profiles?: {
    full_name: string;
    department: string | null;
  };
}

export function useLeave() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaveTypes = async () => {
    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .order('name');

    if (!error && data) {
      setLeaveTypes(data);
    }
  };

  const fetchLeaveRequests = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          leave_types (id, name, days_allowed)
        `)
        .order('created_at', { ascending: false });

      if (role !== 'admin') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch profiles separately for admin
      if (role === 'admin' && data) {
        const userIds = [...new Set(data.map((r) => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, department')
          .in('user_id', userIds);

        const requestsWithProfiles = data.map((request) => ({
          ...request,
          profiles: profiles?.find((p) => p.user_id === request.user_id),
        }));

        setLeaveRequests(requestsWithProfiles as LeaveRequest[]);
      } else {
        setLeaveRequests(data as LeaveRequest[]);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
    fetchLeaveRequests();
  }, [user, role]);

  const createLeaveRequest = async (
    leaveTypeId: string,
    startDate: string,
    endDate: string,
    reason: string
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('leave_requests').insert({
        user_id: user.id,
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        reason,
      });

      if (error) throw error;

      toast({
        title: 'Leave Request Submitted',
        description: 'Your leave request has been submitted for approval.',
      });

      await fetchLeaveRequests();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateLeaveStatus = async (
    requestId: string,
    status: 'approved' | 'rejected',
    adminNotes?: string
  ) => {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status, admin_notes: adminNotes })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: `Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        description: `The leave request has been ${status}.`,
      });

      await fetchLeaveRequests();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const pendingCount = leaveRequests.filter((r) => r.status === 'pending').length;

  return {
    leaveRequests,
    leaveTypes,
    loading,
    pendingCount,
    createLeaveRequest,
    updateLeaveStatus,
    refetch: fetchLeaveRequests,
  };
}