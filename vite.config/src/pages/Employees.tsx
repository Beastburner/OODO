import DashboardLayout from '@/components/layout/DashboardLayout';
import { useEmployees } from '@/hooks/useEmployees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { Users, Search, Edit, Mail, Phone, Building, Briefcase } from 'lucide-react';
import { useState } from 'react';

export default function Employees() {
  const { employees, loading, updateEmployee } = useEmployees();
  const [search, setSearch] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    department: '',
    position: '',
    phone: '',
    base_salary: '',
  });

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.department?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee);
    setEditForm({
      department: employee.department || '',
      position: employee.position || '',
      phone: employee.phone || '',
      base_salary: employee.base_salary?.toString() || '',
    });
  };

  const handleSave = async () => {
    if (!editingEmployee) return;
    
    await updateEmployee(editingEmployee.user_id, {
      department: editForm.department || null,
      position: editForm.position || null,
      phone: editForm.phone || null,
      base_salary: editForm.base_salary ? parseFloat(editForm.base_salary) : null,
    });
    
    setEditingEmployee(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Employees</h1>
            <p className="text-muted-foreground">Manage your team members</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Stats Card */}
        <Card className="border-0 shadow-sm gradient-primary text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-foreground/10 rounded-xl">
                <Users className="h-8 w-8" />
              </div>
              <div>
                <p className="text-3xl font-bold">{employees.length}</p>
                <p className="opacity-90">Total Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employees Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">All Employees</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : filteredEmployees.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No employees found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                {employee.full_name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{employee.full_name}</p>
                              <p className="text-sm text-muted-foreground">{employee.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{employee.department || 'Unassigned'}</Badge>
                        </TableCell>
                        <TableCell>{employee.position || '-'}</TableCell>
                        <TableCell>{employee.phone || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(employee)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Employee</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 pt-4">
                                <div className="flex items-center gap-4 pb-4 border-b">
                                  <Avatar className="h-12 w-12">
                                    <AvatarFallback className="bg-primary text-primary-foreground">
                                      {editingEmployee?.full_name
                                        ?.split(' ')
                                        .map((n: string) => n[0])
                                        .join('')
                                        .toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{editingEmployee?.full_name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {editingEmployee?.email}
                                    </p>
                                  </div>
                                </div>
                                <div className="grid gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="department" className="flex items-center gap-2">
                                      <Building className="h-4 w-4" /> Department
                                    </Label>
                                    <Input
                                      id="department"
                                      value={editForm.department}
                                      onChange={(e) =>
                                        setEditForm({ ...editForm, department: e.target.value })
                                      }
                                      placeholder="e.g., Engineering"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="position" className="flex items-center gap-2">
                                      <Briefcase className="h-4 w-4" /> Position
                                    </Label>
                                    <Input
                                      id="position"
                                      value={editForm.position}
                                      onChange={(e) =>
                                        setEditForm({ ...editForm, position: e.target.value })
                                      }
                                      placeholder="e.g., Senior Developer"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="phone" className="flex items-center gap-2">
                                      <Phone className="h-4 w-4" /> Phone
                                    </Label>
                                    <Input
                                      id="phone"
                                      value={editForm.phone}
                                      onChange={(e) =>
                                        setEditForm({ ...editForm, phone: e.target.value })
                                      }
                                      placeholder="e.g., +1234567890"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="salary">Base Salary ($)</Label>
                                    <Input
                                      id="salary"
                                      type="number"
                                      value={editForm.base_salary}
                                      onChange={(e) =>
                                        setEditForm({ ...editForm, base_salary: e.target.value })
                                      }
                                      placeholder="e.g., 50000"
                                    />
                                  </div>
                                </div>
                                <Button onClick={handleSave} className="w-full">
                                  Save Changes
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
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