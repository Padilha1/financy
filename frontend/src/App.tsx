import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, ProtectedRoute, useAuth } from './auth';
import { Layout } from './components/Layout';
const AuthPage = lazy(() =>
  import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })),
);
const Dashboard = lazy(() =>
  import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })),
);
const Transactions = lazy(() =>
  import('./pages/Transactions').then((module) => ({ default: module.Transactions })),
);
const Categories = lazy(() =>
  import('./pages/Categories').then((module) => ({ default: module.Categories })),
);
const Profile = lazy(() =>
  import('./pages/Profile').then((module) => ({ default: module.Profile })),
);
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
function Home() {
  const { authenticated } = useAuth();
  return authenticated ? <ProtectedRoute /> : <AuthPage />;
}
export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <Suspense
          fallback={
            <div className="loading-page" role="status">
              Carregando…
            </div>
          }
        >
          <Routes>
            <Route element={<Home />}>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
              </Route>
            </Route>
            <Route path="/cadastro" element={<AuthPage register />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/transacoes" element={<Transactions />} />
                <Route path="/categorias" element={<Categories />} />
                <Route path="/perfil" element={<Profile />} />
              </Route>
            </Route>
            <Route
              path="*"
              element={
                <main className="full-state">
                  <h1>Página não encontrada</h1>
                  <Link className="button primary" to="/">
                    Voltar ao início
                  </Link>
                </main>
              }
            />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
