import { type ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { useGetCurrentUser, useLogOut } from '@workspace/api-client-react';
import type { User } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { AppShell } from '@/components/campus-ui';
import { LoginPage, SignupPage } from '@/pages/auth';
import { JobsPage } from '@/pages/jobs';
import { ProfilePage } from '@/pages/profile';
import { CompanyDashboardPage } from '@/pages/company';
import NotFound from '@/pages/not-found';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });

function LoadingScreen({ label = 'Opening your workspace…' }: { label?: string }) {
  return <AppShell><main className="page-wrap" style={{paddingTop:'7rem'}}><div className="card" style={{padding:'2rem', maxWidth:520, margin:'0 auto'}}><div className="skeleton" style={{width:'32%', height:14, marginBottom:'.8rem'}} /><div className="skeleton" style={{width:'76%', height:30, marginBottom:'.9rem'}} /><div className="skeleton" style={{width:'100%', height:12, marginBottom:'.45rem'}} /><p className="muted" style={{fontSize:'.8rem', margin:'1rem 0 0'}}>{label}</p></div></main></AppShell>;
}

function AccessGate({ role, children }: { role: 'student' | 'company'; children: (user: User, onLogout: () => void) => ReactNode }) {
  const [, setLocation] = useLocation();
  const sessionQuery = useGetCurrentUser();
  const logout = useLogOut();
  useEffect(() => {
    if (sessionQuery.isError) setLocation('/');
    if (sessionQuery.data?.user && sessionQuery.data.user.role !== role) setLocation(sessionQuery.data.user.role === 'company' ? '/company/dashboard' : '/jobs');
  }, [sessionQuery.isError, sessionQuery.data, role, setLocation]);
  if (sessionQuery.isLoading) return <LoadingScreen />;
  if (!sessionQuery.data?.user || sessionQuery.data.user.role !== role) return <LoadingScreen label="Taking you to the right workspace…" />;
  const onLogout = () => logout.mutate(undefined, { onSuccess: () => { queryClient.clear(); setLocation('/'); } });
  return <>{children(sessionQuery.data.user, onLogout)}</>;
}

function StudentRoute() {
  return <AccessGate role="student">{(user, onLogout) => <JobsPage user={user} onLogout={onLogout} />}</AccessGate>;
}

function ProfileRoute() {
  return <AccessGate role="student">{(user, onLogout) => <ProfilePage user={user} onLogout={onLogout} />}</AccessGate>;
}

function CompanyRoute() {
  return <AccessGate role="company">{(user, onLogout) => <CompanyDashboardPage user={user} onLogout={onLogout} />}</AccessGate>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><Switch>
    <Route path="/" component={LoginPage} />
    <Route path="/signup" component={SignupPage} />
    <Route path="/jobs" component={StudentRoute} />
    <Route path="/profile" component={ProfileRoute} />
    <Route path="/company/dashboard" component={CompanyRoute} />
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;