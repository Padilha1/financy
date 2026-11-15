import { NavLink, Outlet } from 'react-router-dom';
import { useMe } from '../auth';
import { initials, Logo } from './ui';
export function Layout() {
  const { data } = useMe();
  return (
    <>
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <div className="header-inner">
          <NavLink to="/" className="brand-link" aria-label="Financy — Dashboard">
            <Logo />
          </NavLink>
          <nav aria-label="Principal">
            <NavLink to="/" end>
              Dashboard
            </NavLink>
            <NavLink to="/transacoes">Transações</NavLink>
            <NavLink to="/categorias">Categorias</NavLink>
          </nav>
          <NavLink
            className={({ isActive }) => `avatar ${isActive ? 'selected' : ''}`}
            to="/perfil"
            aria-label="Meu perfil"
          >
            {initials(data?.me.name ?? '')}
          </NavLink>
        </div>
      </header>
      <main id="main" className="app-main" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}
