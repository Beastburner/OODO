import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEmployees } from '@/hooks/useEmployees';
import { useLeave } from '@/hooks/useLeave';
import { useAttendance } from '@/hooks/useAttendance';
import StatsCard from './StatsCard';
import InsightsPanel from './InsightsPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Clock, Wallet, Check, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(151, 55%, 42%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)'];

export default function AdminDashboard() {
  const { employees, totalCount } = useEmployees();
  const { leaveRequests, pendingCount, updateLeaveStatus } = useLeave();
  const { attendance } = useAttendance();
  const [totalPayroll, setTotalPayroll] = useState(0);
  const [todayAttendanceRate, setTodayAttendanceRate] = useState(0);

  useEffect(() => {
    // Calculate today's attendance rate
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.filter((a) => a.date === today);
    const rate = totalCount > 0 ? Math.round((todayAttendance.length / totalCount) * 100) : 0;
    setTodayAttendanceRate(rate);

    // Fetch total payroll
    const fetchPayrollTotal = async () => {
      const { data } = await supabase
        .from('payroll')
        .select('net_salary')
        .eq('payment_status', 'pending');

      if (data) {
        const total = data.reduce((sum, p) => sum + Number(p.net_salary), 0);
        setTotalPayroll(total);
      }
    };
    fetchPayrollTotal();
  }, [attendance, totalCount]);

  // Prepare chart data
  const attendanceChartData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split('T')[0];
    const count = attendance.filter((a) => a.date === dateStr).length;
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      count,
    };
  });

  const departmentData = employees.reduce((acc: { name: string; value: number }[], emp) => {
    const dept = emp.department || 'Unassigned';
    const existing = acc.find((d) => d.name === dept);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: dept, value: 1 });
    }
    return acc;
  }, []);

  const pendingRequests = leaveRequests.filter((r) => r.status === 'pending').slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Employees"
          value={totalCount}
          subtitle="Active members"
          icon={<Users className="h-6 w-6 text-primary" />}
          variant="primary"
        />
        <StatsCard
          title="Pending Requests"
          value={pendingCount}
          subtitle="Leave requests"
          icon={<Calendar className="h-6 w-6 text-warning" />}
          variant="warning"
        />
        <StatsCard
          title="Today's Attendance"
          value={`${todayAttendanceRate}%`}
          subtitle="Present rate"
          icon={<Clock className="h-6 w-6 text-success" />}
          variant="success"
        />
        <StatsCard
          title="Pending Payroll"
          value={`$${totalPayroll.toLocaleString()}`}
          subtitle="This month"
          icon={<Wallet className="h-6 w-6 text-info" />}
          variant="info"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceChartData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-muted-foreground" fontSize={12} />
                  <YAxis className="text-muted-foreground" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(217, 91%, 60%)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">By Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {departmentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {departmentData.map((dept, index) => (
                <div key={dept.name} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{dept.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Panel */}
      <InsightsPanel />

      {/* Pending Leave Requests */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Pending Leave Requests</CardTitle>
          <Badge variant="secondary">{pendingCount} pending</Badge>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pending requests</p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{request.profiles?.full_name || 'Employee'}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.leave_types?.name} • {request.start_date} to {request.end_date}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-success border-success hover:bg-success hover:text-success-foreground"
                      onClick={() => updateLeaveStatus(request.id, 'approved')}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => updateLeaveStatus(request.id, 'rejected')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}