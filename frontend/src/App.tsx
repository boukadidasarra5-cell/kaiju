import { AppProvider, useApp } from './context';
import Login from './components/Login';
import Layout from './components/Layout';
import Notifications from './components/Notifications';
import TokyorkMap from './components/TokyorkMap';
import DashboardView from './views/DashboardView';
import ResourcesView from './views/ResourcesView';
import CalendarView from './views/CalendarView';
import TransferForm from './views/TransferForm';

function AppContent() {
  const { user, booting, currentView } = useApp();

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-xs tracking-widest" style={{ backgroundColor: '#0d1117', color: '#8b949e' }}>
        CONNECTING…
      </div>
    );
  }
  if (!user) return <Login />;

  const VIEWS: Record<string, React.ReactNode> = {
    map:       <TokyorkMap />,
    dashboard: <DashboardView />,
    resources: <ResourcesView />,
    calendar:  <CalendarView />,
    transfer:  <TransferForm />,
  };

  return (
    <>
      <Layout>{VIEWS[currentView] ?? <TokyorkMap />}</Layout>
      <Notifications />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}