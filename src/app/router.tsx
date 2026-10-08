import { createHashRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'

import { SettingsPage } from '../features/settings'
import { InventoryPage } from '../features/inventory'
import { PosPage } from '../features/pos'
import { ReportesRoute } from '../features/reportes/ReportesRoute'
import { CuentasCorrientesRoute } from '../features/cuentas-corrientes/CuentasCorrientesRoute'

export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/pos" replace /> },
      { path: '/pos', element: <PosPage /> },
      { path: '/inventory', element: <InventoryPage /> },
      { path: '/accounts', element: <CuentasCorrientesRoute /> },
      { path: '/reports', element: <ReportesRoute /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/inventory" replace /> },
])