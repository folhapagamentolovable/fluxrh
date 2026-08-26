import { describe, expect, it } from "vitest";
import { can, requirePermission, type AuthContext } from "./authorization.js";

const context = (role: AuthContext["role"]): AuthContext => ({
  userId: "user_test",
  organizationId: "organization_test",
  role,
});

describe("organization authorization", () => {
  it("gives owners every foundational permission", () => {
    expect(can(context("owner"), "organization:manage")).toBe(true);
    expect(can(context("owner"), "audit:read")).toBe(true);
  });

  it("separates HR and payroll responsibilities", () => {
    expect(can(context("hr"), "people:write")).toBe(true);
    expect(can(context("hr"), "payroll:write")).toBe(false);
    expect(can(context("payroll"), "payroll:write")).toBe(true);
    expect(can(context("payroll"), "people:write")).toBe(false);
  });

  it("keeps audit access restricted", () => {
    expect(can(context("auditor"), "audit:read")).toBe(true);
    expect(can(context("manager"), "audit:read")).toBe(false);
  });

  it("throws when a required permission is missing", () => {
    expect(() => requirePermission(context("employee"), "organization:manage"))
      .toThrow("forbidden:organization:manage");
  });
});
