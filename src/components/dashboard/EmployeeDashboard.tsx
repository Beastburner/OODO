import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeave } from '@/hooks/useLeave';
import { usePayroll } from '@/hooks/usePayroll';
import StatsCard from './StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, Calendar, Wallet, User, LogIn, LogOut, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { attendance, todayRecord, clockIn, clockOut } = useAttendance();
  const { leaveRequests, leaveTypes } = useLeave();
  const { payroll } = usePayroll();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setProfile(data);
    };
    fetchProfile();
  }, [user]);

  const initials = profile?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || 'U';

  // Calculate leave balance
  const usedLeaves = leaveRequests.filter((r) => r.status === 'approved').length;
  const totalAllowed = leaveTypes.reduce((sum, t) => sum + t.days_allowed, 0);
  const remainingLeaves = totalAllowed - usedLeaves;

  // Calculate attendance this month
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const monthlyAttendance = attendance.filter((a) => {
    const date = new Date(a.date);
    return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
  });

  // Get latest payroll
  const latestPayroll = payroll[0];

  // Get recent attendance
  const recentAttendance = attendance.slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile Card */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="gradient-primary h-24" />
        <CardContent className="pt-0 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
            <Avatar className="h-24 w-24 border-4 border-card">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left pb-1">
              <h2 className="text-2xl font-bold">{profile?.full_name || 'Employee'}</h2>
              <p className="text-muted-foreground">
                {profile?.position || 'Position'} • {profile?.department || 'Department'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Leave Balance"
          value={remainingLeaves}
          subtitle={`${usedLeaves} used of ${totalAllowed}`}
          icon={<Calendar className="h-6 w-6 text-success" />}
          variant="success"
        />
        <StatsCard
          title="This Month"
          value={monthlyAttendance.length}
          subtitle="Days attended"
          icon={<Clock className="h-6 w-6 text-primary" />}
          variant="primary"
        />
        <StatsCard
          title="Next Salary"
          value={latestPayroll ? `$${Number(latestPayroll.net_salary).toLocaleString()}` : 'N/A'}
          subtitle={latestPayroll?.payment_status === 'paid' ? 'Paid' : 'Pending'}
          icon={<Wallet className="h-6 w-6 text-info" />}
          variant="info"
        />
      </div>

      {/* Clock In/Out Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Today's Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-3xl font-bold">
                {format(new Date(), 'EEEE, MMMM d')}
              </p>
              <p className="text-muted-foreground mt-1">
                {format(new Date(), 'h:mm a')}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {todayRecord?.clock_in && (
                <div className="text-center px-4 py-2 bg-success/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">Clock In</p>
                  <p className="font-semibold text-success">
                    {format(new Date(todayRecord.clock_in), 'h:mm a')}
                  </p>
                </div>
              )}
              {todayRecord?.clock_out && (
                <div className="text-center px-4 py-2 bg-info/10 rounded-lg">
                  <p className="text-xs text-muted-foreground">Clock Out</p>
                  <p className="font-semibold text-info">
                    {format(new Date(todayRecord.clock_out), 'h:mm a')}
                  </p>
                </div>
              )}

              {!todayRecord ? (
                <Button onClick={clockIn} className="gap-2" size="lg">
                  <LogIn className="h-5 w-5" />
                  Clock In
                </Button>
              ) : !todayRecord.clock_out ? (
                <Button onClick={clockOut} variant="outline" className="gap-2" size="lg">
                  <LogOut className="h-5 w-5" />
                  Clock Out
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Day Complete</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recent Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAttendance.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No attendance records yet</p>
            ) : (
              <div className="space-y-3">
                {recentAttendance.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div>
                      <p className="font-medium">
                        {format(new Date(record.date), 'EEEE, MMM d')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {record.clock_in && format(new Date(record.clock_in), 'h:mm a')}
                        {record.clock_out && ` - ${format(new Date(record.clock_out), 'h:mm a')}`}
                      </p>
                    </div>
                    <Badge
                      variant={record.status === 'present' ? 'default' : 'secondary'}
                      className={
                        record.status === 'present'
                          ? 'bg-success/10 text-success hover:bg-success/20'
                          : record.status === 'late'
                          ? 'bg-warning/10 text-warning hover:bg-warning/20'
                          : ''
                      }
                    >
                      {record.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leave Request Status */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">My Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {leaveRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No leave requests yet</p>
            ) : (
              <div className="space-y-3">
                {leaveRequests.slice(0, 5).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div>
                      <p className="font-medium">{request.leave_types?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.start_date} to {request.end_date}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        request.status === 'approved'
                          ? 'bg-success/10 text-success'
                          : request.status === 'rejected'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-warning/10 text-warning'
                      }
                    >
                      {request.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}