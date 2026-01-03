import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendance } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, LogIn, LogOut, CheckCircle, Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function Attendance() {
  const { role } = useAuth();
  const { attendance, todayRecord, clockIn, clockOut, loading } = useAttendance();
  const { employees } = useEmployees();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const isAdmin = role === 'admin';

  // Get employee name by user_id
  const getEmployeeName = (userId: string) => {
    const employee = employees.find((e) => e.user_id === userId);
    return employee?.full_name || 'Unknown';
  };

  // Filter attendance
  const filteredAttendance = attendance.filter((record) => {
    const matchesSearch = isAdmin
      ? getEmployeeName(record.user_id).toLowerCase().includes(search.toLowerCase())
      : true;
    const matchesDate = dateFilter ? record.date === dateFilter : true;
    return matchesSearch && matchesDate;
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-success/10 text-success';
      case 'late':
        return 'bg-warning/10 text-warning';
      case 'absent':
        return 'bg-destructive/10 text-destructive';
      case 'half_day':
        return 'bg-info/10 text-info';
      default:
        return '';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Track team attendance' : 'Your attendance records'}
          </p>
        </div>

        {/* Clock In/Out for Employees */}
        {!isAdmin && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Today's Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-3xl font-bold">{format(new Date(), 'EEEE, MMMM d')}</p>
                  <p className="text-muted-foreground mt-1">{format(new Date(), 'h:mm a')}</p>
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
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {isAdmin && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          <div className="relative w-full sm:w-48">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          {dateFilter && (
            <Button variant="ghost" onClick={() => setDateFilter('')}>
              Clear
            </Button>
          )}
        </div>

        {/* Attendance Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : filteredAttendance.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No attendance records found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isAdmin && <TableHead>Employee</TableHead>}
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendance.map((record) => (
                      <TableRow key={record.id}>
                        {isAdmin && <TableCell className="font-medium">{getEmployeeName(record.user_id)}</TableCell>}
                        <TableCell>{format(new Date(record.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          {record.clock_in
                            ? format(new Date(record.clock_in), 'h:mm a')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {record.clock_out
                            ? format(new Date(record.clock_out), 'h:mm a')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusColor(record.status)}>
                            {record.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}