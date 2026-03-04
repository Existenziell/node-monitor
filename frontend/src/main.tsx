import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ConsoleProvider } from '@/contexts/ConsoleContext';
import { ApiProvider } from '@/contexts/ApiContext';
import '@/index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ThemeProvider>
      <ConsoleProvider>
        <ApiProvider>
          <App />
        </ApiProvider>
      </ConsoleProvider>
    </ThemeProvider>
  </React.StrictMode>
);
