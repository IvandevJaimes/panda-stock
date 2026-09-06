import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { PosPage } from '../features/pos'
import { ProductsPage } from '../features/products'
import { InventoryPage } from '../features/inventory'
import { CustomersPage } from '../features/customers'
import { CashRegisterPage } from '../features/cash-register'
import { ReportsPage } from '../features/reports'
import { SettingsPage } from '../features/settings'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <PosPage /> },
      { path: '/pos', element: <PosPage /> },
      { path: '/products', element: <ProductsPage /> },
      { path: '/inventory', element: <InventoryPage /> },
      { path: '/customers', element: <CustomersPage /> },
      { path: '/cash-register', element: <CashRegisterPage /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
])
