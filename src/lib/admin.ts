export const ADMIN_EMAIL = "ntando@nesmaholdings.co.za";

export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === ADMIN_EMAIL;
}
