import { useCallback } from 'react';
import toast from 'react-hot-toast';

interface ConfirmOptions {
  onConfirm: () => void;
  onCancel?: () => void;
}

export const useNotification = () => {
  const showSuccess = useCallback((message: string) => {
    toast.success(message, {
      duration: 3000,
      position: 'top-right',
    });
  }, []);

  const showError = useCallback((message: string) => {
    toast.error(message, {
      duration: 5000,
      position: 'top-right',
    });
  }, []);

  const showWarning = useCallback((message: string) => {
    toast(message, {
      duration: 4000,
      position: 'top-right',
      icon: '⚠️',
      style: {
        background: '#FEF3C7',
        color: '#92400E',
        border: '1px solid #F59E0B',
      },
    });
  }, []);

  const showInfo = useCallback((message: string) => {
    toast(message, {
      duration: 3000,
      position: 'top-right',
      icon: 'ℹ️',
      style: {
        background: '#E0F2FE',
        color: '#0369A1',
        border: '1px solid #0EA5E9',
      },
    });
  }, []);

  const confirm = useCallback(
    (title: string, message: string, options: ConfirmOptions) => {
      const { onConfirm, onCancel } = options;

      // Como o toast aceita um componente React como parâmetro,
      // mas não podemos usar JSX aqui, vamos usar uma abordagem diferente
      const toastId = toast.custom(
        (t) => {
          // Retornamos uma string vazia, mas na implementação real
          // isso seria um componente React com botões de confirmação
          return '';
        },
        {
          duration: Infinity,
          position: 'top-center',
        }
      );

      return toastId;
    },
    []
  );

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    confirm,
  };
};
