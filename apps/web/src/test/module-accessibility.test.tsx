import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ExceptionsPage } from "@/features/exceptions/ExceptionsPage";
import { EmployeesPage } from "@/features/employees/EmployeesPage";
import { AdmissionsPage } from "@/features/admissions/AdmissionsPage";
import { OrganizationsPage } from "@/features/organizations/OrganizationsPage";
import { TimeTrackingPage } from "@/features/time-tracking/TimeTrackingPage";
import { AbsencesPage } from "@/features/absences/AbsencesPage";
import { BenefitsPage } from "@/features/benefits/BenefitsPage";
import { SpecialCalculationsPage } from "@/features/special-calculations/SpecialCalculationsPage";
import { PayrollPage } from "@/features/payroll/PayrollPage";
import { TerminationsPage } from "@/features/terminations/TerminationsPage";
import { DocumentsPage } from "@/features/documents/DocumentsPage";
import { CommunicationsPage } from "@/features/communications/CommunicationsPage";
import { AnalyticsPage } from "@/features/analytics/AnalyticsPage";
import { OccupationalHealthPage } from "@/features/occupational-health/OccupationalHealthPage";
import { PatrolsPage } from "@/features/patrols/PatrolsPage";
import { WorkflowsPage } from "@/features/workflows/WorkflowsPage";
import { EmployeePortalPage } from "@/features/portal/EmployeePortalPage";
import { AuthProvider } from "@/auth/AuthProvider";

const pages = [DashboardPage, ExceptionsPage, EmployeesPage, AdmissionsPage, OrganizationsPage,
  TimeTrackingPage, AbsencesPage, BenefitsPage, SpecialCalculationsPage, PayrollPage, TerminationsPage,
  DocumentsPage, CommunicationsPage, AnalyticsPage, OccupationalHealthPage, PatrolsPage, WorkflowsPage,
  EmployeePortalPage];

describe("module accessibility baseline", () => {
  it.each(pages.map((Page) => [Page.name, Page] as const))("has no serious Axe violations: %s", async (_name, Page) => {
    const view = render(<AuthProvider><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><Page/></MemoryRouter></QueryClientProvider></AuthProvider>);
    await waitFor(() => expect(view.container.querySelector("h1")).toBeTruthy());
    const result = await axe.run(view.container, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] }, rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  });
});
