import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLeave } from '@/hooks/useLeave';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Plus, Check, X, Clock } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function Leave() {
  const { role } = useAuth();
  const { leaveRequests, leaveTypes, loading, createLeaveRequest, updateLeaveStatus } = useLeave();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const isAdmin = role === 'admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createLeaveRequest(
      formData.leaveTypeId,
      formData.startDate,
      formData.endDate,
      formData.reason
    );
    setFormData({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
    setDialogOpen(false);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-success/10 text-success';
      case 'rejected':
        return 'bg-destructive/10 text-destructive';
      case 'pending':
        return 'bg-warning/10 text-warning';
      default:
        return '';
    }
  };

  const getDaysCount = (startDate: string, endDate: string) => {
    return differenceInDays(new Date(endDate), new Date(startDate)) + 1;
  };

  // Calculate leave balance for employees
  const leaveBalance = leaveTypes.map((type) => {
    const usedDays = leaveRequests
      .filter((r) => r.leave_type_id === type.id && r.status === 'approved')
      .reduce((sum, r) => sum + getDaysCount(r.start_date, r.end_date), 0);
    return {
      ...type,
      used: usedDays,
      remaining: type.days_allowed - usedDays,
    };
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Leave Management</h1>
            <p className="text-muted-foreground">
              {isAdmin ? 'Manage leave requests' : 'Request and track your leaves'}
            </p>
          </div>
          {!isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Request Leave
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Leave</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Leave Type</Label>
                    <Select
                      value={formData.leaveTypeId}
                      onValueChange={(value) => setFormData({ ...formData, leaveTypeId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        {leaveTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name} ({type.days_allowed} days/year)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Briefly describe your reason for leave..."
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Submit Request
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Leave Balance (for employees) */}
        {!isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {leaveBalance.map((type) => (
              <Card key={type.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{type.name}</p>
                      <p className="text-2xl font-bold">{type.remaining}</p>
                      <p className="text-xs text-muted-foreground">
                        {type.used} used of {type.days_allowed}
                      </p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Leave Requests Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">
              {isAdmin ? 'All Leave Requests' : 'My Leave Requests'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : leaveRequests.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No leave requests found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isAdmin && <TableHead>Employee</TableHead>}
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests.map((request) => (
                      <TableRow key={request.id}>
                        {isAdmin && (
                          <TableCell className="font-medium">
                            {request.profiles?.full_name || 'Employee'}
                          </TableCell>
                        )}
                        <TableCell>{request.leave_types?.name || '-'}</TableCell>
                        <TableCell>
                          {format(new Date(request.start_date), 'MMM d')} -{' '}
                          {format(new Date(request.end_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>{getDaysCount(request.start_date, request.end_date)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {request.reason || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusColor(request.status)}>
                            {request.status}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            {request.status === 'pending' && (
                              <div className="flex justify-end gap-2">
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
                            )}
                          </TableCell>
                        )}
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