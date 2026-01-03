import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: 'present' | 'late' | 'absent' | 'half_day';
  notes: string | null;
}

export function useAttendance() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const fetchAttendance = async () => {
    if (!user) return;

    try {
      const query = supabase
        .from('attendance')
        .select('*')
        .order('date', { ascending: false });

      if (role !== 'admin') {
        query.eq('user_id', user.id);
      }

      const { data, error } = await query.limit(30);

      if (error) throw error;

      setAttendance(data as AttendanceRecord[]);
      
      const todayData = data?.find((a) => a.date === today && a.user_id === user.id);
      setTodayRecord(todayData as AttendanceRecord | null);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [user, role]);

  const clockIn = async () => {
    if (!user) return;

    try {
      const now = new Date();
      const clockInTime = now.toISOString();
      const isLate = now.getHours() >= 9 && now.getMinutes() > 30;

      const { data, error } = await supabase
        .from('attendance')
        .insert({
          user_id: user.id,
          date: today,
          clock_in: clockInTime,
          status: isLate ? 'late' : 'present',
        })
        .select()
        .single();

      if (error) throw error;

      setTodayRecord(data as AttendanceRecord);
      toast({
        title: 'Clocked In!',
        description: `You clocked in at ${now.toLocaleTimeString()}`,
      });

      await fetchAttendance();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const clockOut = async () => {
    if (!user || !todayRecord) return;

    try {
      const now = new Date();
      const clockOutTime = now.toISOString();

      const { data, error } = await supabase
        .from('attendance')
        .update({ clock_out: clockOutTime })
        .eq('id', todayRecord.id)
        .select()
        .single();

      if (error) throw error;

      setTodayRecord(data as AttendanceRecord);
      toast({
        title: 'Clocked Out!',
        description: `You clocked out at ${now.toLocaleTimeString()}`,
      });

      await fetchAttendance();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return {
    attendance,
    todayRecord,
    loading,
    clockIn,
    clockOut,
    refetch: fetchAttendance,
  };
}