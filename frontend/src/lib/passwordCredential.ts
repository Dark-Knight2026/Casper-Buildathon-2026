/**
 * Save a username/password pair to the browser's credential store right after a
 * successful sign-in, so the password manager reliably offers it next time.
 *
 * Why this exists: our auth forms submit over `fetch` and redirect immediately,
 * which defeats the heuristic ("did a real form navigate?") that Chrome/Safari
 * use to decide whether to prompt "Save password?". The Credential Management
 * API stores the pair explicitly instead of relying on that guess.
 *
 * Scope: Chromium only (Chrome/Edge/Brave). Safari and Firefox don't expose
 * `window.PasswordCredential`, so there we silently no-op and lean on the native
 * autocomplete heuristic — which is why the forms still set proper
 * `autocomplete` + `name` attributes. Requires a secure context (HTTPS or
 * localhost). Best-effort: never throws and never blocks the auth flow.
 */
interface PasswordCredentialInit {
  /** The identifier the user signs in with — their email here. */
  id: string;
  password: string;
  /** Optional human-readable display name shown in the browser UI. */
  name?: string;
}

interface PasswordCredentialCtor {
  new (data: PasswordCredentialInit): Credential;
}

export async function storePasswordCredential({ id, password, name }: PasswordCredentialInit): Promise<void> {
  const Ctor = (window as unknown as { PasswordCredential?: PasswordCredentialCtor }).PasswordCredential;
  // Feature-detect the constructor AND store(); bail on empty pairs (e.g. a
  // reset flow where we never learned the email).
  if (!Ctor || !navigator.credentials?.store || !id || !password) return;
  try {
    await navigator.credentials.store(new Ctor({ id, password, name: name?.trim() || undefined }));
  } catch {
    // Storing is a convenience; a rejection (user-gesture rules, permissions
    // policy, private mode) must not surface as an auth failure.
  }
}
