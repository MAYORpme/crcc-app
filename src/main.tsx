import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register the service worker (offline + add to home screen) in production builds.
if (import.meta.env.PROD && 'serviceWorker' in navigator && import.meta.env.VITE_NO_SW !== '1') {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true })).catch(() => {});
}
