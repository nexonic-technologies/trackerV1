import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/authProvider'
import { PermissionProvider } from './context/permissionProvider'
import App from './App'
import { ThemeProvider } from './context/themeProvider'
import { NotificationProvider } from './context/notificationProvider'



ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <PermissionProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </PermissionProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
