import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import styles from "./Layout.module.css";

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMain}>Solar Dashboard</span>
          <span className={styles.brandSub}>powered by Shell Global</span>
        </div>
        <nav className={styles.nav}>
          <NavLink to="/" end className={({ isActive }) => (isActive ? styles.active : "")}>
            Dashboard
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => (isActive ? styles.active : "")}>
            Profile settings
          </NavLink>
        </nav>
        <div className={styles.sidebarFoot}>
          <span className={styles.userHint}>{user?.username}</span>
          <button type="button" className={styles.logout} onClick={logout}>
            Logout
          </button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
