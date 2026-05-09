import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { CustomerListPage } from '@/features/customers/pages/CustomerListPage';
import { CustomerDetailPage } from '@/features/customers/pages/CustomerDetailPage';
import { LeadListPage } from '@/features/leads/pages/LeadListPage';
import { ContactsListPage } from '@/features/contacts/pages/ContactsListPage';
import { OpportunityListPage } from '@/features/opportunities/pages/OpportunityListPage';
import { OpportunityDetailPage } from '@/features/opportunities/pages/OpportunityDetailPage';
import { ReportsPage } from '@/features/reports/pages/ReportsPage';
import { OrderListPage } from '@/features/orders/pages/OrderListPage';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { ProtectedRoute } from '@/shared/lib/guards';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'customers', element: <CustomerListPage /> },
      { path: 'customers/:id', element: <CustomerDetailPage /> },
      { path: 'leads', element: <LeadListPage /> },
      { path: 'contacts', element: <ContactsListPage /> },
      { path: 'opportunities', element: <OpportunityListPage /> },
      { path: 'opportunities/:id', element: <OpportunityDetailPage /> },
      { path: 'orders', element: <OrderListPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
