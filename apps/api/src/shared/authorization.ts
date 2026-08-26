export const organizationRoles = [
  "owner",
  "admin",
  "hr",
  "payroll",
  "manager",
  "employee",
  "auditor",
] as const;

export type OrganizationRole = (typeof organizationRoles)[number];

export const permissions = [
  "organization:manage",
  "people:read",
  "people:write",
  "payroll:read",
  "payroll:write",
  "workflow:operate",
  "audit:read",
] as const;

export type Permission = (typeof permissions)[number];

const rolePermissions: Record<OrganizationRole, ReadonlySet<Permission>> = {
  owner: new Set(permissions),
  admin: new Set(permissions),
  hr: new Set(["people:read", "people:write", "workflow:operate"]),
  payroll: new Set(["people:read", "payroll:read", "payroll:write", "workflow:operate"]),
  manager: new Set(["people:read", "workflow:operate"]),
  employee: new Set(["people:read"]),
  auditor: new Set(["people:read", "payroll:read", "audit:read"]),
};

export type AuthContext = {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
};

export function can(context: AuthContext, permission: Permission): boolean {
  return rolePermissions[context.role].has(permission);
}

export function requirePermission(context: AuthContext, permission: Permission): void {
  if (!can(context, permission)) {
    throw new Error(`forbidden:${permission}`);
  }
}
