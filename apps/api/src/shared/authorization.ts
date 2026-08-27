export const organizationRoles = [
  "owner",
  "admin",
  "hr",
  "payroll",
  "manager",
  "employee",
  "auditor",
  "finance",
  "supervisor",
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
  "sensitive:read",
  "reports:export",
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
  finance: new Set(["payroll:read", "reports:export"]),
  supervisor: new Set(["people:read", "workflow:operate"]),
};

export type AuthContext = {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  companyIds?: string[];
  departmentIds?: string[];
  teamEmployeeIds?: string[];
};

export type ResourceScope={organizationId:string;companyId?:string;departmentId?:string;employeeId?:string};

export function can(context: AuthContext, permission: Permission): boolean {
  return rolePermissions[context.role].has(permission);
}

export function isWithinScope(context:AuthContext,resource:ResourceScope):boolean{return context.organizationId===resource.organizationId&&(!resource.companyId||!context.companyIds?.length||context.companyIds.includes(resource.companyId))&&(!resource.departmentId||!context.departmentIds?.length||context.departmentIds.includes(resource.departmentId))&&(!context.teamEmployeeIds?.length||!resource.employeeId||context.teamEmployeeIds.includes(resource.employeeId))}
export function maskSensitive(value:string,visible:boolean):string{if(visible)return value;if(value.includes("@")){const[name,domain]=value.split("@");return`${name.slice(0,2)}***@${domain}`}const digits=value.replace(/\D/g,"");return digits.length>4?`***${digits.slice(-4)}`:"***"}
export function assertSegregation(requesterId:string,approverId:string):void{if(requesterId===approverId)throw new Error("segregation_of_duties")}

export function requirePermission(context: AuthContext, permission: Permission): void {
  if (!can(context, permission)) {
    throw new Error(`forbidden:${permission}`);
  }
}
