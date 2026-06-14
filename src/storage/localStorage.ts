const TOKEN_KEY = '@token';
const REFRESH_TOKEN_KEY = '@refreshToken';
const USER_KEY = '@user';

export interface User {
  id: string;
  nome: string;
  email: string;
  cpf?: string;
  telefone?: string;
  tipo: 'PACIENTE' | 'MEDICO' | 'ADMIN';
  crmCartaoValidado?: boolean;
  crmNumero?: string;
  crmUf?: string;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function mergeUserPreservingOptionalFields(previous: User | null, next: User): User {
  const sameUser = Boolean(previous && previous.id === next.id);
  const nextCpf = normalizeOptionalString(next.cpf);
  const nextTelefone = normalizeOptionalString(next.telefone);

  return {
    ...next,
    cpf: nextCpf ?? (sameUser ? previous?.cpf : undefined),
    telefone: nextTelefone ?? (sameUser ? previous?.telefone : undefined),
  };
}

export async function saveToken(token: string): Promise<void> {
  localStorage.setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return localStorage.getItem(TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
  localStorage.removeItem(TOKEN_KEY);
}

export async function saveRefreshToken(refreshToken: string): Promise<void> {
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getRefreshToken(): Promise<string | null> {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function removeRefreshToken(): Promise<void> {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function saveUser(user: User): Promise<void> {
  const previous = await getUser();
  const merged = mergeUserPreservingOptionalFields(previous, user);
  localStorage.setItem(USER_KEY, JSON.stringify(merged));
}

export async function getUser(): Promise<User | null> {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export async function removeUser(): Promise<void> {
  localStorage.removeItem(USER_KEY);
}

export async function clearAll(): Promise<void> {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function saveAuthSession(
  token: string,
  user: User,
  refreshToken?: string,
): Promise<void> {
  await saveToken(token);
  if (refreshToken) await saveRefreshToken(refreshToken);
  await saveUser(user);
}

export async function getAuthSession(): Promise<{ token: string | null; user: User | null }> {
  const [token, user] = await Promise.all([getToken(), getUser()]);
  return { token, user };
}

export async function clearAuthSession(): Promise<void> {
  await clearAll();
}
