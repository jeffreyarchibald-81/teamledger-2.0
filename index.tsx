import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App'; // Corrected path
import { AuthProvider } from './src/auth'; // Corrected path

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* AuthProvider wraps the entire application to provide authentication state (isUnlocked) 
        and the unlock function to all child components. */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);