import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TabProvider } from '@/contexts/TabContext';
import { ApiProvider } from '@/contexts/ApiContext';
import { RefreshProvider } from '@/contexts/RefreshContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { NotificationContainer } from '@/components/Notification';
import '@/index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ThemeProvider>
      <TabProvider>
        <ApiProvider>
          <RefreshProvider>
            <NotificationProvider>
              <>
                <NotificationContainer />
                <App />
              </>
            </NotificationProvider>
          </RefreshProvider>
        </ApiProvider>
      </TabProvider>
    </ThemeProvider>
  </React.StrictMode>
);
