import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PayrollRecord {
  id: string;
  user_id: string;
  month: number;
  year: number;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  payment_status: string;
  paid_at: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    department: string | null;
    position: string | null;
  };
}

export function usePayroll() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayroll = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('payroll')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (role !== 'admin') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch profiles for admin
      if (role === 'admin' && data) {
        const userIds = [...new Set(data.map((r) => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, department, position')
          .in('user_id', userIds);

        const payrollWithProfiles = data.map((record) => ({
          ...record,
          profiles: profiles?.find((p) => p.user_id === record.user_id),
        }));

        setPayroll(payrollWithProfiles as PayrollRecord[]);
      } else {
        setPayroll(data as PayrollRecord[]);
      }
    } catch (error) {
      console.error('Error fetching payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [user, role]);

  const generatePayroll = async (
    userId: string,
    month: number,
    year: number,
    baseSalary: number,
    allowances: number,
    deductions: number
  ) => {
    try {
      const netSalary = baseSalary + allowances - deductions;

      const { error } = await supabase.from('payroll').insert({
        user_id: userId,
        month,
        year,
        base_salary: baseSalary,
        allowances,
        deductions,
        net_salary: netSalary,
      });

      if (error) throw error;

      toast({
        title: 'Payroll Generated',
        description: 'Payroll record has been created successfully.',
      });

      await fetchPayroll();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const markAsPaid = async (payrollId: string) => {
    try {
      const { error } = await supabase
        .from('payroll')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', payrollId);

      if (error) throw error;

      toast({
        title: 'Payment Marked',
        description: 'Payroll has been marked as paid.',
      });

      await fetchPayroll();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return {
    payroll,
    loading,
    generatePayroll,
    markAsPaid,
    refetch: fetchPayroll,
  };
}