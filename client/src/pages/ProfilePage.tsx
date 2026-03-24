import { useAuth } from "../auth/AuthContext";
import styles from "./ProfilePage.module.css";

export function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Profile settings</h1>
      <p className={styles.lead}>Account details for the signed-in administrator.</p>
      <div className={styles.card}>
        <label>
          Username
          <input type="text" value={user?.username ?? ""} readOnly />
        </label>
        <label>
          Email
          <input type="email" value={user?.emailId ?? ""} readOnly />
        </label>
        <p className={styles.note}>
          Password and notification preferences can be wired to your identity provider in a production
          deployment. This demo uses local authentication only.
        </p>
      </div>
    </div>
  );
}
