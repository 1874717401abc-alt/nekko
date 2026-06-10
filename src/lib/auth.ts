export const SESSION_COOKIE = "nekko_session";

function sitePassword(): string {
  return process.env.SITE_PASSWORD ?? "nekko";
}

export function expectedSessionToken(): string {
  return sitePassword();
}

export function verifyPassword(password: string): boolean {
  return password === sitePassword();
}

export function isValidSessionToken(token: string | undefined): boolean {
  return !!token && token === expectedSessionToken();
}
