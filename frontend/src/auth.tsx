import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet } from 'react-router-dom';
import { errorMessage, queryClient, request, token } from './api';
import type { AuthPayload } from './types';
import { Button } from './components/ui';
const AuthContext = createContext({
  authenticated: false,
  signIn: (_data: AuthPayload, _remember: boolean) => {},
  signOut: () => {},
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(!!token());
  function signOut() {
    localStorage.removeItem('financy.token');
    sessionStorage.removeItem('financy.token');
    setAuthenticated(false);
    queryClient.clear();
  }
  useEffect(() => {
    window.addEventListener('financy:logout', signOut);
    return () => window.removeEventListener('financy:logout', signOut);
  }, []);
  function signIn(data: AuthPayload, remember: boolean) {
    queryClient.clear();
    localStorage.removeItem('financy.token');
    sessionStorage.removeItem('financy.token');
    (remember ? localStorage : sessionStorage).setItem('financy.token', data.token);
    setAuthenticated(true);
    queryClient.setQueryData(['me'], { me: data.user });
  }
  return (
    <AuthContext.Provider value={{ authenticated, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  return useContext(AuthContext);
}
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => request<{ me: AuthPayload['user'] }>('query {me{id name email}}'),
    retry: false,
  });
}
export function ProtectedRoute() {
  const { authenticated } = useAuth();
  return authenticated ? <SessionGate /> : <Navigate to="/" replace />;
}
function SessionGate() {
  const me = useMe();
  if (me.isPending)
    return (
      <div className="full-state" role="status">
        Carregando sua conta…
      </div>
    );
  if (me.isError)
    return (
      <div className="full-state">
        <p role="alert">{errorMessage(me.error)}</p>
        <Button onClick={() => void me.refetch()}>Tentar novamente</Button>
      </div>
    );
  return <Outlet />;
}
