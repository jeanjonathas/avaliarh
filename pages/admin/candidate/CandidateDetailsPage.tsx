import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useNotification } from '../../../contexts/NotificationContext';
import Navbar from '../../../components/admin/Navbar';
import InfoTab from '../../../components/admin/candidate-tabs/InfoTab';
import ResponsesTab from '../../../components/admin/candidate-tabs/ResponsesTab';
import PerformanceTab from '../../../components/admin/candidate-tabs/PerformanceTab';

// Tipo para o candidato
interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  testDate: string;
  interviewDate?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  completed: boolean;
  rating?: number;
  observations?: string;
  infoJobsLink?: string;
  socialMediaUrl?: string;
  resumeFile?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  resumeUrl?: string;
  inviteCode?: string;
  inviteExpires?: string;
  inviteSent?: boolean;
  inviteAttempts?: number;
  testId?: string;
  score?: number;
  createdAt: string;
  updatedAt: string;
  responses?: Response[];
  stageScores?: StageScore[];
  test?: {
    id: string;
    title: string;
    TestStage: {
      stage: {
        id: string;
        title: string;
      };
      order: number;
    }[];
  };
}

// Tipo para as respostas
interface Response {
  id: string;
  questionId: string;
  optionId: string;
  questionText: string;
  optionText: string;
  isCorrectOption: boolean;
  stageName?: string;
  stageId?: string;
  categoryName?: string;
  questionSnapshot?: string | any;
  allOptionsSnapshot?: string | any;
}

// Tipo para os scores das etapas
interface StageScore {
  id: string;
  name: string;
  percentage: number;
  correct: number;
  total: number;
}

// Tipo para as etapas do teste
interface Stage {
  id: string;
  name: string;
  questions: Question[];
}

// Tipo para as questões do teste
interface Question {
  id: string;
  text: string;
  options: Option[];
}

// Tipo para as opções das questões
interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

// Componente principal
const CandidateDetailsPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { showToast } = useNotification();
  const { id } = router.query;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [observations, setObservations] = useState('');
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  // Buscar dados do candidato
  useEffect(() => {
    if (status === 'authenticated' && id) {
      fetchCandidate();
    }
  }, [status, id]);

  const fetchCandidate = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/candidates/${id}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar dados do candidato');
      }
      const data = await response.json();
      console.log('Dados do candidato carregados:', data);
      setCandidate(data);
      setObservations(data.observations || '');
    } catch (error) {
      console.error('Erro:', error);
      showToast('Erro ao carregar dados do candidato', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar status do candidato
  const handleStatusChange = async (status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    try {
      const response = await fetch(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar status');
      }

      setCandidate(prev => prev ? { ...prev, status } : null);
      showToast('Status atualizado com sucesso', 'success');
    } catch (error) {
      console.error('Erro:', error);
      showToast('Erro ao atualizar status', 'error');
    }
  };

  // Atualizar avaliação do candidato
  const handleRatingChange = async (rating: number) => {
    try {
      const response = await fetch(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar avaliação');
      }

      setCandidate(prev => prev ? { ...prev, rating } : null);
      showToast('Avaliação atualizada com sucesso', 'success');
    } catch (error) {
      console.error('Erro:', error);
      showToast('Erro ao atualizar avaliação', 'error');
    }
  };

  // Atualizar observações
  const handleObservationsChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setObservations(event.target.value);
  };

  const handleSaveObservations = async () => {
    try {
      const response = await fetch(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ observations }),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar observações');
      }

      setCandidate(prev => prev ? { ...prev, observations } : null);
      showToast('Observações salvas com sucesso', 'success');
    } catch (error) {
      console.error('Erro:', error);
      showToast('Erro ao salvar observações', 'error');
    }
  };

  // Gerar novo convite
  const generateNewInvite = async () => {
    try {
      setIsGeneratingInvite(true);
      const response = await fetch(`/api/candidates/${id}/generate-invite`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar novo convite');
      }

      const data = await response.json();
      setCandidate(prev => prev ? { ...prev, ...data } : null);
      showToast('Novo convite gerado com sucesso', 'success');
    } catch (error) {
      console.error('Erro:', error);
      showToast('Erro ao gerar novo convite', 'error');
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  // Enviar convite por email
  const sendInviteByEmail = async () => {
    try {
      const response = await fetch(`/api/candidates/${id}/send-invite`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar convite');
      }

      const data = await response.json();
      setCandidate(prev => prev ? { ...prev, ...data } : null);
      showToast('Convite enviado com sucesso', 'success');
    } catch (error) {
      console.error('Erro:', error);
      showToast('Erro ao enviar convite', 'error');
    }
  };

  // Compartilhar por WhatsApp
  const shareByWhatsApp = () => {
    if (!candidate?.inviteCode) return;
    
    const testUrl = `${window.location.origin}/teste/convite/${candidate.inviteCode}`;
    const message = `Olá ${candidate.name}, você foi convidado para realizar um teste de avaliação. Acesse o link: ${testUrl}`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-secondary-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-secondary-800 mb-4">Candidato não encontrado</h2>
            <p className="text-secondary-600">
              Não foi possível encontrar o candidato com o ID especificado.
            </p>
            <button
              onClick={() => router.push('/admin/candidates')}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition duration-200"
            >
              Voltar para Lista de Candidatos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-secondary-800">{candidate.name}</h1>
            <p className="text-secondary-600">{candidate.email}</p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              onClick={() => router.push('/admin/candidates')}
              className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-md hover:bg-secondary-200 transition duration-200"
            >
              Voltar para Lista
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="flex border-b border-secondary-200">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-4 px-6 text-center font-medium ${
                activeTab === 'info'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-secondary-600 hover:text-secondary-800 hover:bg-secondary-50'
              }`}
            >
              <div className="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Informações
              </div>
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`flex-1 py-4 px-6 text-center font-medium ${
                activeTab === 'performance'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-secondary-600 hover:text-secondary-800 hover:bg-secondary-50'
              }`}
            >
              <div className="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2h14a1 1 0 100-2H3zm0 6a1 1 0 000 2h9a1 1 0 100-2H3zm0 6a1 1 0 100 2h6a1 1 0 100-2H3z" clipRule="evenodd" />
                </svg>
                Desempenho
              </div>
            </button>
            <button
              onClick={() => setActiveTab('responses')}
              className={`flex-1 py-4 px-6 text-center font-medium ${
                activeTab === 'responses'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-secondary-600 hover:text-secondary-800 hover:bg-secondary-50'
              }`}
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-1.707-.707L12 7 8.707 4.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Respostas
              </div>
            </button>
          </div>

          {/* Conteúdo das Abas */}
          <div className="p-6">
            {activeTab === 'info' && (
              <InfoTab 
                candidate={candidate}
                handleStatusChange={handleStatusChange}
                handleRatingChange={handleRatingChange}
                handleObservationsChange={handleObservationsChange}
                handleSaveObservations={handleSaveObservations}
                generateNewInvite={generateNewInvite}
                sendInviteByEmail={sendInviteByEmail}
                shareByWhatsApp={shareByWhatsApp}
                isGeneratingInvite={isGeneratingInvite}
              />
            )}
            
            {activeTab === 'performance' && (
              <PerformanceTab candidate={candidate} />
            )}
            
            {activeTab === 'responses' && (
              <ResponsesTab candidate={candidate} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDetailsPage;
