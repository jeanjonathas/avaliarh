import React, { useState, useEffect } from 'react';

interface DeleteConfirmationAlertsProps {
  companyName: string;
  onConfirm: () => void;
  onCancel: () => void;
  onDeactivate: () => void;
}

const DeleteConfirmationAlerts: React.FC<DeleteConfirmationAlertsProps> = ({
  companyName,
  onConfirm,
  onCancel,
  onDeactivate
}) => {
  const [step, setStep] = useState(1);
  
  // Mensagens de alerta para cada etapa
  const alertMessages = [
    {
      title: 'ATENÇÃO!',
      message: `Você está prestes a excluir a empresa "${companyName}". Esta ação não pode ser revertida facilmente.`,
      confirmText: 'Continuar',
      cancelText: 'Cancelar'
    },
    {
      title: 'CONFIRMAÇÃO NECESSÁRIA!',
      message: 'Todos os dados associados a esta empresa (incluindo usuários, candidatos e testes) serão movidos para backup e excluídos do sistema. Tem certeza que deseja continuar?',
      confirmText: 'Sim, continuar',
      cancelText: 'Não, cancelar'
    },
    {
      title: 'ÚLTIMA CHANCE!',
      message: 'Em vez de excluir, você pode apenas desativar a empresa. Empresas desativadas podem ser reativadas posteriormente. Deseja desativar em vez de excluir?',
      confirmText: 'Não, excluir permanentemente',
      cancelText: 'Sim, apenas desativar'
    }
  ];

  const handleNext = () => {
    if (step < alertMessages.length) {
      setStep(step + 1);
    } else {
      onConfirm();
    }
  };

  const handleCancel = () => {
    // No último passo, "Cancelar" significa desativar em vez de excluir
    if (step === alertMessages.length) {
      onDeactivate();
    } else {
      onCancel();
    }
  };

  // Obtém a mensagem atual com base no passo
  const currentAlert = alertMessages[step - 1];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden transform transition-all">
        <div className="bg-red-600 p-4">
          <h3 className="text-xl font-bold text-white">{currentAlert.title}</h3>
        </div>
        <div className="p-6">
          <p className="text-gray-700 mb-4">{currentAlert.message}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
            >
              {currentAlert.cancelText}
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              {currentAlert.confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationAlerts;
