// Session-scoped admin password: survives refresh and in-app navigation, clears when
// the tab/browser closes. Gates metadata edits only (see the security note in the spec).
const KEY = "drivo:admin_pw";

export function loadAdminPassword(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveAdminPassword(pw: string): void {
  try {
    sessionStorage.setItem(KEY, pw);
  } catch {
    /* storage unavailable — degrade to in-memory only */
  }
}

export function clearAdminPassword(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
