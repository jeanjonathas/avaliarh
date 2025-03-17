import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import Toast from '../components/ui/Toast';
import Modal from '../components/ui/Modal';

type ToastType = 'success' | 'error' | 'info' | 'warning';
type ModalType = 'info' | 'warning' | 'error' | 'success' | 'confirm';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ModalType;
  onConfirm: () => void;
  onCancel: () => void;
}

interface NotificationContextData {
  showToast: (message: string, type: ToastType, duration?: number) => void;
  showModal: (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      type?: ModalType;
      confirmText?: string;
      cancelText?: string;
      onCancel?: () => void;
    }
  ) => void;
  closeModal: () => void;
}

export const NotificationContext = createContext<NotificationContextData>({} as NotificationContextData);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'confirm',
    onConfirm: () => {},
    onCancel: () => {}
  });

  // Função para exibir um toast
  const showToast = useCallback((message: string, type: ToastType, duration = 10000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prevToasts) => [...prevToasts, { id, message, type, duration }]);
  }, []);

  // Função para remover um toast
  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  // Função para exibir um modal
  const showModal = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      type?: ModalType;
      confirmText?: string;
      cancelText?: string;
      onCancel?: () => void;
    }
  ) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      confirmText: options?.confirmText || 'Confirmar',
      cancelText: options?.cancelText || 'Cancelar',
      type: options?.type || 'confirm',
      onConfirm: () => {
        onConfirm();
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
      },
      onCancel: options?.onCancel || (() => setModalConfig((prev) => ({ ...prev, isOpen: false })))
    });
  }, []);

  // Função para fechar o modal
  const closeModal = useCallback(() => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        showToast,
        showModal,
        closeModal
      }}
    >
      {children}
      
      {/* Renderizar todos os toasts */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
      
      {/* Renderizar o modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        onCancel={modalConfig.onCancel}
      />
    </NotificationContext.Provider>
  );
};

// Hook personalizado para usar o contexto de notificação
export const useNotification = (): NotificationContextData => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  
  return context;
};
