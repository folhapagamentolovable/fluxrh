import { useAuth } from '../contexts/AuthContext';

/**
 * Hook para verificar permissões do usuário
 * 
 * Regras atuais:
 * - Admin: CRUD em todas as páginas
 * - Manager: Somente leitura nas páginas das suas empresas, EXCETO Férias e Mensagens (CRUD)
 * - User: Acesso apenas ao portal do funcionário
 */
export const usePermissions = () => {
    const { isAdmin, isManager, isAdminOrManager } = useAuth();

    /**
     * Verifica se o usuário pode criar/editar/excluir em uma página específica
     * Apenas admins podem fazer CRUD (exceto em páginas específicas)
     */
    const canCrud = (): boolean => {
        return isAdmin;
    };

    /**
     * Verifica se o usuário pode apenas visualizar (sem editar/excluir)
     * Managers são read-only (exceto em páginas específicas)
     */
    const isReadOnly = (): boolean => {
        return isManager && !isAdmin;
    };

    /**
     * Verifica se deve mostrar o formulário de cadastro/edição
     * Apenas admins veem o formulário (exceto em páginas específicas)
     */
    const canShowForm = (): boolean => {
        return isAdmin;
    };

    /**
     * Verifica se deve mostrar botões de ação (editar, excluir)
     * Apenas admins veem os botões (exceto em páginas específicas)
     */
    const canShowActions = (): boolean => {
        return isAdmin;
    };

    /**
     * Verifica se o usuário pode acessar páginas administrativas
     * Admins e Managers podem
     */
    const canAccessAdmin = (): boolean => {
        return isAdminOrManager;
    };

    /**
     * Verifica se o usuário tem CRUD na página de Férias e Mensagens
     * TANTO admins QUANTO managers podem fazer CRUD nessa página
     */
    const canCrudVacation = (): boolean => {
        return isAdminOrManager;
    };

    return {
        isAdmin,
        isManager,
        isAdminOrManager,
        canCrud,
        isReadOnly,
        canShowForm,
        canShowActions,
        canAccessAdmin,
        canCrudVacation,
    };
};

export default usePermissions;
