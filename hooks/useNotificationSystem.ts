import { useNotification } from '../contexts/NotificationContext';

/**
 * Hook personalizado para facilitar o uso do sistema de notificações em qualquer componente
 * Substitui os alertas padrão do navegador por notificações estilizadas
 */
export const useNotificationSystem = () => {
  const { showToast, showModal } = useNotification();

  /**
   * Exibe uma mensagem de sucesso
   * @param message Mensagem a ser exibida
   * @param duration Duração em milissegundos (padrão: 10000ms = 10s)
   */
  const showSuccess = (message: string, duration?: number) => {
    showToast(message, 'success', duration);
  };

  /**
   * Exibe uma mensagem de erro
   * @param message Mensagem a ser exibida
   * @param duration Duração em milissegundos (padrão: 10000ms = 10s)
   */
  const showError = (message: string, duration?: number) => {
    showToast(message, 'error', duration);
  };

  /**
   * Exibe uma mensagem de informação
   * @param message Mensagem a ser exibida
   * @param duration Duração em milissegundos (padrão: 10000ms = 10s)
   */
  const showInfo = (message: string, duration?: number) => {
    showToast(message, 'info', duration);
  };

  /**
   * Exibe uma mensagem de aviso
   * @param message Mensagem a ser exibida
   * @param duration Duração em milissegundos (padrão: 10000ms = 10s)
   */
  const showWarning = (message: string, duration?: number) => {
    showToast(message, 'warning', duration);
  };

  /**
   * Exibe um diálogo de confirmação
   * @param title Título do diálogo
   * @param message Mensagem a ser exibida
   * @param onConfirm Função a ser executada quando o usuário confirmar
   * @param options Opções adicionais (tipo, texto dos botões)
   */
  const confirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      type?: 'info' | 'warning' | 'error' | 'success' | 'confirm';
      confirmText?: string;
      cancelText?: string;
    }
  ) => {
    showModal(title, message, onConfirm, options);
  };

  /**
   * Substituto para o alert padrão do navegador
   * @param message Mensagem a ser exibida
   */
  const alert = (message: string) => {
    showModal(
      'Aviso',
      message,
      () => {}, // Função vazia para confirmação
      {
        type: 'info',
        confirmText: 'OK',
        cancelText: '' // Esconder botão de cancelar
      }
    );
  };

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    confirm,
    alert
  };
};

export default useNotificationSystem;
