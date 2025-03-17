import { useContext } from 'react';
import { NotificationContext } from '../contexts/NotificationContext';

type ModalType = 'info' | 'warning' | 'error' | 'success' | 'confirm';

/**
 * Hook para utilizar o sistema de modais da aplicação
 * Fornece funções para exibir e fechar modais
 */
export const useModal = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useModal deve ser usado dentro de um NotificationProvider');
  }

  return {
    /**
     * Exibe um modal com as configurações especificadas
     * @param title Título do modal
     * @param message Mensagem do modal
     * @param onConfirm Função a ser executada quando o usuário confirmar
     * @param options Opções adicionais (tipo, texto dos botões)
     */
    showModal: context.showModal,
    
    /**
     * Fecha o modal atual
     */
    closeModal: context.closeModal
  };
};
