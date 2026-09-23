import { createHashRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'

import { SettingsPage } from '../features/settings'
import { InventoryPage } from '../features/inventory'

export const router = createHashRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/inventory" replace /> },
      { path: '/inventory', element: <InventoryPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/inventory" replace /> },
])