import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { usePayroll } from '@/hooks/usePayroll';
import { useEmployees } from '@/hooks/useEmployees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Wallet, Plus, Download, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Payroll() {
  const { role } = useAuth();
  const { payroll, loading, generatePayroll, markAsPaid } = usePayroll();
  const { employees } = useEmployees();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    month: (new Date().getMonth() + 1).toString(),
    year: new Date().getFullYear().toString(),
    baseSalary: '',
    allowances: '0',
    deductions: '0',
  });

  const isAdmin = role === 'admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await generatePayroll(
      formData.userId,
      parseInt(formData.month),
      parseInt(formData.year),
      parseFloat(formData.baseSalary),
      parseFloat(formData.allowances),
      parseFloat(formData.deductions)
    );
    setFormData({
      userId: '',
      month: (new Date().getMonth() + 1).toString(),
      year: new Date().getFullYear().toString(),
      baseSalary: '',
      allowances: '0',
      deductions: '0',
    });
    setDialogOpen(false);
  };

  const handleSelectEmployee = (userId: string) => {
    const employee = employees.find((e) => e.user_id === userId);
    setFormData({
      ...formData,
      userId,
      baseSalary: employee?.base_salary?.toString() || '',
    });
  };

  const downloadSalarySlip = (record: any) => {
    // Create a simple salary slip as PDF-like HTML
    const slipContent = `
      SALARY SLIP
      ============
      
      Employee: ${record.profiles?.full_name || 'Employee'}
      Department: ${record.profiles?.department || 'N/A'}
      Position: ${record.profiles?.position || 'N/A'}
      
      Period: ${MONTHS[record.month - 1]} ${record.year}
      
      -----------------------------------
      EARNINGS
      -----------------------------------
      Base Salary:     $${Number(record.base_salary).toLocaleString()}
      Allowances:      $${Number(record.allowances).toLocaleString()}
      
      -----------------------------------
      DEDUCTIONS
      -----------------------------------
      Deductions:      $${Number(record.deductions).toLocaleString()}
      
      -----------------------------------
      NET SALARY:      $${Number(record.net_salary).toLocaleString()}
      -----------------------------------
      
      Status: ${record.payment_status.toUpperCase()}
      ${record.paid_at ? `Paid on: ${format(new Date(record.paid_at), 'MMM d, yyyy')}` : ''}
    `;

    const blob = new Blob([slipContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary-slip-${MONTHS[record.month - 1]}-${record.year}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{isAdmin ? 'Payroll Management' : 'Salary Slips'}</h1>
            <p className="text-muted-foreground">
              {isAdmin ? 'Generate and manage payroll' : 'View your salary records'}
            </p>
          </div>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Generate Payroll
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Payroll</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select value={formData.userId} onValueChange={handleSelectEmployee}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.user_id} value={emp.user_id}>
                            {emp.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Month</Label>
                      <Select
                        value={formData.month}
                        onValueChange={(v) => setFormData({ ...formData, month: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((month, idx) => (
                            <SelectItem key={idx} value={(idx + 1).toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Input
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Base Salary ($)</Label>
                    <Input
                      type="number"
                      value={formData.baseSalary}
                      onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                      placeholder="e.g., 5000"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Allowances ($)</Label>
                      <Input
                        type="number"
                        value={formData.allowances}
                        onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Deductions ($)</Label>
                      <Input
                        type="number"
                        value={formData.deductions}
                        onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Net Salary:</span>
                      <span className="font-bold text-lg">
                        ${(
                          (parseFloat(formData.baseSalary) || 0) +
                          (parseFloat(formData.allowances) || 0) -
                          (parseFloat(formData.deductions) || 0)
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    Generate Payroll
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Summary Stats for Admin */}
        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm gradient-primary text-primary-foreground">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-foreground/10 rounded-xl">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm opacity-90">Total Pending</p>
                    <p className="text-2xl font-bold">
                      $
                      {payroll
                        .filter((p) => p.payment_status === 'pending')
                        .reduce((sum, p) => sum + Number(p.net_salary), 0)
                        .toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm gradient-success text-success-foreground">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-foreground/10 rounded-xl">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm opacity-90">Total Paid</p>
                    <p className="text-2xl font-bold">
                      $
                      {payroll
                        .filter((p) => p.payment_status === 'paid')
                        .reduce((sum, p) => sum + Number(p.net_salary), 0)
                        .toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm gradient-info text-info-foreground">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-foreground/10 rounded-xl">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm opacity-90">Records</p>
                    <p className="text-2xl font-bold">{payroll.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payroll Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{isAdmin ? 'Payroll Records' : 'My Salary Slips'}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : payroll.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No payroll records found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isAdmin && <TableHead>Employee</TableHead>}
                      <TableHead>Period</TableHead>
                      <TableHead>Base Salary</TableHead>
                      <TableHead>Allowances</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payroll.map((record) => (
                      <TableRow key={record.id}>
                        {isAdmin && (
                          <TableCell className="font-medium">
                            {record.profiles?.full_name || 'Employee'}
                          </TableCell>
                        )}
                        <TableCell>
                          {MONTHS[record.month - 1]} {record.year}
                        </TableCell>
                        <TableCell>${Number(record.base_salary).toLocaleString()}</TableCell>
                        <TableCell>${Number(record.allowances).toLocaleString()}</TableCell>
                        <TableCell>${Number(record.deductions).toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">
                          ${Number(record.net_salary).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              record.payment_status === 'paid'
                                ? 'bg-success/10 text-success'
                                : 'bg-warning/10 text-warning'
                            }
                          >
                            {record.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadSalarySlip(record)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {isAdmin && record.payment_status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-success border-success hover:bg-success hover:text-success-foreground"
                                onClick={() => markAsPaid(record.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
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