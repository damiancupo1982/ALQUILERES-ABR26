import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppWithSupabase from './AppWithSupabase.tsx';
import AuthWrapper from './components/AuthWrapper.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthWrapper>
      {(session) => <AppWithSupabase />}
    </AuthWrapper>
  </StrictMode>
);
