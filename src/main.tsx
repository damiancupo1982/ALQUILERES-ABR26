import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppWithSupabase from './AppWithSupabase';
import AuthWrapper from './components/AuthWrapper';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthWrapper>
      {(session) => <AppWithSupabase session={session} />}
    </AuthWrapper>
  </StrictMode>
);