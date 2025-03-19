import { useState } from 'react';
import { useNotification } from '../../../contexts/NotificationContext';

interface GenerateInviteButtonProps {
  candidateId: string;
  processId: string;
  testId: string;
  onSuccess: (inviteCode: string) => void;
}

const GenerateInviteButton = ({ candidateId, processId, testId, onSuccess }: GenerateInviteButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { showToast } = useNotification();

  const handleGenerateInvite = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/admin/candidates/${candidateId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          testId,
          processId 
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar convite');
      }

      const data = await response.json();
      onSuccess(data.inviteCode);
      showToast('Convite gerado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao gerar convite:', error);
      showToast('Erro ao gerar convite. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGenerateInvite}
      disabled={loading}
      className="px-3 py-1 text-sm bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Gerando...' : 'Convidar'}
    </button>
  );
};

export default GenerateInviteButton;
