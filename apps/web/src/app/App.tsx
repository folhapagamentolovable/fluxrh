import { Navigate, Route, Routes } from "react-router-dom";
import { CalendarDays, CircleDollarSign, Clock3, FileText, Settings2, Workflow } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ExceptionsPage } from "@/features/exceptions/ExceptionsPage";
import { ModulePlaceholder } from "@/features/employees/ModulePlaceholder";
import { OrganizationsPage } from "@/features/organizations/OrganizationsPage";
import { EmployeesPage } from "@/features/employees/EmployeesPage";
import { EmployeeProfilePage } from "@/features/employees/EmployeeProfilePage";
import { WorkflowsPage } from "@/features/workflows/WorkflowsPage";
import { AdmissionsPage } from "@/features/admissions/AdmissionsPage";
import { AdmissionDetailPage } from "@/features/admissions/AdmissionDetailPage";
import { DocumentsPage } from "@/features/documents/DocumentsPage";
import { DocumentDetailPage } from "@/features/documents/DocumentDetailPage";
import { TimeTrackingPage } from "@/features/time-tracking/TimeTrackingPage";
import { AbsencesPage } from "@/features/absences/AbsencesPage";
import { PayrollPage } from "@/features/payroll/PayrollPage";
import { BenefitsPage } from "@/features/benefits/BenefitsPage";
import { SpecialCalculationsPage } from "@/features/special-calculations/SpecialCalculationsPage";
import { TerminationsPage } from "@/features/terminations/TerminationsPage";
import { EmployeePortalPage } from "@/features/portal/EmployeePortalPage";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { LoginPage } from "@/features/auth/LoginPage";
import { OrganizationGate } from "@/auth/OrganizationGate";

export function App() {
  return <Routes>
    <Route path="entrar" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}><Route element={<OrganizationGate />}><Route element={<AppShell />}>
    <Route index element={<DashboardPage />} />
    <Route path="excecoes" element={<ExceptionsPage />} />
    <Route path="pessoas" element={<EmployeesPage />} />
    <Route path="pessoas/:id" element={<EmployeeProfilePage />} />
    <Route path="portal" element={<EmployeePortalPage />} />
    <Route path="admissoes" element={<AdmissionsPage />} />
    <Route path="admissoes/nova" element={<AdmissionsPage />} />
    <Route path="admissoes/:id" element={<AdmissionDetailPage />} />
    <Route path="empresas" element={<OrganizationsPage />} />
    <Route path="jornada" element={<TimeTrackingPage />} />
    <Route path="ferias" element={<AbsencesPage />} />
    <Route path="beneficios" element={<BenefitsPage />} />
    <Route path="calculos" element={<SpecialCalculationsPage />} />
    <Route path="folha" element={<PayrollPage />} />
    <Route path="desligamentos" element={<TerminationsPage />} />
    <Route path="documentos" element={<DocumentsPage />} />
    <Route path="documentos/:id" element={<DocumentDetailPage />} />
    <Route path="automacoes" element={<WorkflowsPage />} />
    <Route path="configuracoes" element={<ModulePlaceholder title="Configurações" description="Usuários, permissões, parâmetros e personalização por empresa." icon={Settings2} />} />
    <Route path="*" element={<Navigate to="/" replace />} />
    </Route></Route></Route>
  </Routes>;
}
