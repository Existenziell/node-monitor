import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ApiProvider } from '@/contexts/ApiContext';
import { RefreshProvider } from '@/contexts/RefreshContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import '@/index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ThemeProvider>
      <ApiProvider>
        <RefreshProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </RefreshProvider>
      </ApiProvider>
    </ThemeProvider>
  </React.StrictMode>
);
