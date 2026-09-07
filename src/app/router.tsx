import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'

import { SettingsPage } from '../features/settings'
import { InventoryPage } from '../features/inventory'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { path: '/inventory', element: <InventoryPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
])
