import App from './App';

type AppWithSupabaseProps = {
  session?: unknown;
};

const AppWithSupabase = (_props: AppWithSupabaseProps) => {
  return <App />;
};

export default AppWithSupabase;