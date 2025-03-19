import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useNotification } from '../../../contexts/NotificationContext';
import AddCandidateModal from '../../candidates/modals/AddCandidateModal';

interface Candidate {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
}

interface CandidateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  processId: string;
  onSuccess: () => void;
}

const CandidateSelectionModal: React.FC<CandidateSelectionModalProps> = ({
  isOpen,
  onClose,
  processId,
  onSuccess
}) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddCandidateModalOpen, setIsAddCandidateModalOpen] = useState(false);
  const { showToast } = useNotification();
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      fetchAvailableCandidates();
    }
  }, [isOpen, processId]);

  const fetchAvailableCandidates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Buscar candidatos que não estão associados ao processo atual
      const response = await fetch(`/api/admin/candidates/available?processId=${processId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar candidatos disponíveis');
      }
      
      const data = await response.json();
      setCandidates(data);
    } catch (err) {
      console.error('Erro ao buscar candidatos:', err);
      setError('Erro ao carregar candidatos disponíveis. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidateToProcess = async (candidateId: string) => {
    try {
      const response = await fetch('/api/admin/processes/candidates/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateId,
          processId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao adicionar candidato ao processo');
      }

      showToast('Candidato adicionado ao processo com sucesso!', 'success');
      
      // Remover o candidato da lista
      setCandidates(candidates.filter(c => c.id !== candidateId));
      
      // Atualizar a lista de candidatos do processo
      onSuccess();
    } catch (error) {
      console.error('Erro ao adicionar candidato ao processo:', error);
      showToast(
        error instanceof Error ? error.message : 'Erro ao adicionar candidato ao processo',
        'error'
      );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const handleCreateNewCandidate = () => {
    setIsAddCandidateModalOpen(true);
  };

  const handleNewCandidateSuccess = () => {
    fetchAvailableCandidates();
    onSuccess();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[90%] max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-secondary-200">
          <div>
            <h3 className="text-xl font-semibold text-secondary-800">Adicionar Candidatos ao Processo</h3>
            <p className="mt-1 text-sm text-secondary-500">
              Selecione candidatos existentes ou crie um novo candidato para adicionar ao processo.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-secondary-500"
          >
            <span className="sr-only">Fechar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
            <button
              onClick={fetchAvailableCandidates}
              className="mt-4 px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
            >
              Tentar novamente
            </button>
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Não há candidatos disponíveis para adicionar a este processo.</p>
            <button
              onClick={handleCreateNewCandidate}
              className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
            >
              Cadastrar Novo Candidato
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={handleCreateNewCandidate}
                className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
              >
                Cadastrar Novo Candidato
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data de Cadastro
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {candidates.map((candidate) => (
                    <tr key={candidate.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{candidate.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          candidate.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          candidate.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {candidate.status === 'APPROVED' ? 'Aprovado' :
                           candidate.status === 'REJECTED' ? 'Rejeitado' :
                           'Pendente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(candidate.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleAddCandidateToProcess(candidate.id)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          Adicionar ao Processo
                        </button>
                        <button
                          onClick={() => router.push(`/admin/candidates/${candidate.id}`)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {isAddCandidateModalOpen && (
        <AddCandidateModal
          isOpen={isAddCandidateModalOpen}
          onClose={() => setIsAddCandidateModalOpen(false)}
          onSuccess={handleNewCandidateSuccess}
        />
      )}
    </div>
  );
};

export default CandidateSelectionModal;
