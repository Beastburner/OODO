import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';
import InsightObserverInit from '@/components/InsightObserverInit';

export default function Dashboard() {
  const { role } = useAuth();

  return (
    <DashboardLayout>
      <InsightObserverInit />
      {role === 'admin' ? <AdminDashboard /> : <EmployeeDashboard />}
    </DashboardLayout>
  );
}