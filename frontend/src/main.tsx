import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { reportWebVitals } from './lib/performance';
import { validateICOConfig } from './constants/ico';

// Fail fast if required ICO contract env vars are missing
validateICOConfig();

// Start performance monitoring
reportWebVitals();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);