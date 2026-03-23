export const APP_ROLES = ["OWNER", "ADMIN", "CASHIER", "TRAINER"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function toAppRole(value: string | null | undefined): AppRole | null {
  if (!value) {
    return null;
  }

  const normalized = value.toUpperCase();
  return APP_ROLES.includes(normalized as AppRole) ? (normalized as AppRole) : null;
}

export function canManageUsers(role: string | null | undefined): boolean {
  const appRole = toAppRole(role);
  return appRole === "OWNER" || appRole === "ADMIN";
}

export function canManageProducts(role: string | null | undefined): boolean {
  const appRole = toAppRole(role);
  return appRole === "OWNER" || appRole === "ADMIN";
}

export function canAccessPosProductInventory(role: string | null | undefined): boolean {
  const appRole = toAppRole(role);
  return appRole === "OWNER" || appRole === "ADMIN" || appRole === "CASHIER";
}

export function canDeleteProducts(role: string | null | undefined): boolean {
  return toAppRole(role) === "OWNER";
}

export function canDecreaseProductStock(role: string | null | undefined): boolean {
  return toAppRole(role) === "OWNER";
}

export function canManageMembers(role: string | null | undefined): boolean {
  return toAppRole(role) === "OWNER";
}

export function canManageTrainers(role: string | null | undefined): boolean {
  return toAppRole(role) === "OWNER";
}

export function canViewTrainers(role: string | null | undefined): boolean {
  const appRole = toAppRole(role);
  return appRole === "OWNER" || appRole === "ADMIN" || appRole === "TRAINER";
}
