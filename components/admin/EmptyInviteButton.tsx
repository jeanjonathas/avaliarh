import React, { useState } from 'react';
import CreateEmptyInviteModal from './CreateEmptyInviteModal';
import { useNotification } from '../../hooks/useNotification';

interface EmptyInviteButtonProps {
  className?: string;
}

const EmptyInviteButton: React.FC<EmptyInviteButtonProps> = ({ className = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const notify = useNotification();

  const handleSuccess = (code: string) => {
    setInviteCode(code);
  };

  const handleCopyLink = () => {
    if (!inviteCode) return;
    
    const baseUrl = window.location.origin;
    const inviteLink = `${baseUrl}/test/${inviteCode}`;
    
    navigator.clipboard.writeText(inviteLink)
      .then(() => {
        setShowCopiedMessage(true);
        setTimeout(() => setShowCopiedMessage(false), 2000);
      })
      .catch(err => {
        console.error('Erro ao copiar link:', err);
        notify.showError('Não foi possível copiar o link');
      });
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors flex items-center ${className}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
        </svg>
        Criar Convite Vazio
      </button>

      <CreateEmptyInviteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />

      {inviteCode && (
        <div className="fixed bottom-4 right-4 z-50 bg-white p-4 rounded-lg shadow-lg border border-primary-200 max-w-md">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-secondary-800">Convite Criado!</h3>
            <button
              onClick={() => setInviteCode(null)}
              className="text-secondary-500 hover:text-secondary-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <p className="text-secondary-600 mb-3">
            Código de convite: <span className="font-mono font-bold">{inviteCode}</span>
          </p>
          
          <div className="bg-secondary-50 p-3 rounded-md mb-3">
            <p className="text-sm text-secondary-600 mb-1">Link para o candidato:</p>
            <div className="flex items-center">
              <input
                type="text"
                value={`${window.location.origin}/test/${inviteCode}`}
                readOnly
                className="flex-1 p-2 border border-secondary-300 rounded-l-md text-sm bg-white"
              />
              <button
                onClick={handleCopyLink}
                className="bg-primary-600 text-white p-2 rounded-r-md hover:bg-primary-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
            </div>
            {showCopiedMessage && (
              <p className="text-xs text-green-600 mt-1">Link copiado para a área de transferência!</p>
            )}
          </div>
          
          <p className="text-sm text-secondary-500">
            Quando o candidato acessar este link, ele será solicitado a preencher suas informações antes de iniciar o teste.
          </p>
        </div>
      )}
    </>
  );
};

export default EmptyInviteButton;
