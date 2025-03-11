import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Rating } from '@mui/material';

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  testDate: string;
  interviewDate?: string;
  completed: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
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
}

interface InfoTabProps {
  candidate: Candidate;
  handleStatusChange: (status: 'PENDING' | 'APPROVED' | 'REJECTED') => void;
  handleRatingChange: (rating: number) => void;
  handleObservationsChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSaveObservations: () => void;
  generateNewInvite: () => void;
  sendInviteByEmail: () => void;
  shareByWhatsApp: () => void;
  isGeneratingInvite: boolean;
}

const InfoTab: React.FC<InfoTabProps> = ({
  candidate,
  handleStatusChange,
  handleRatingChange,
  handleObservationsChange,
  handleSaveObservations,
  generateNewInvite,
  sendInviteByEmail,
  shareByWhatsApp,
  isGeneratingInvite
}) => {
  return (
    <div className="space-y-8">
      {/* Informações Básicas */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4">Informações Básicas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <p className="text-sm text-secondary-500">Nome</p>
              <p className="font-medium text-secondary-800">{candidate.name}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-secondary-500">Email</p>
              <p className="font-medium text-secondary-800">{candidate.email}</p>
            </div>
            {candidate.phone && (
              <div className="mb-4">
                <p className="text-sm text-secondary-500">Telefone</p>
                <p className="font-medium text-secondary-800">{candidate.phone}</p>
              </div>
            )}
            {candidate.position && (
              <div className="mb-4">
                <p className="text-sm text-secondary-500">Cargo</p>
                <p className="font-medium text-secondary-800">{candidate.position}</p>
              </div>
            )}
          </div>
          <div>
            <div className="mb-4">
              <p className="text-sm text-secondary-500">Data do Teste</p>
              <p className="font-medium text-secondary-800">
                {candidate.testDate 
                  ? format(new Date(candidate.testDate), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })
                  : 'Não realizado'}
              </p>
            </div>
            {candidate.interviewDate && (
              <div className="mb-4">
                <p className="text-sm text-secondary-500">Data da Entrevista</p>
                <p className="font-medium text-secondary-800">
                  {format(new Date(candidate.interviewDate), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
                </p>
              </div>
            )}
            <div className="mb-4">
              <p className="text-sm text-secondary-500">Status do Teste</p>
              <p className="font-medium">
                {candidate.completed ? (
                  <span className="text-green-600">Concluído</span>
                ) : (
                  <span className="text-yellow-600">Pendente</span>
                )}
              </p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-secondary-500">Pontuação</p>
              <p className="font-medium text-secondary-800">
                {candidate.score !== undefined && candidate.score !== null
                  ? `${candidate.score.toFixed(1)}%`
                  : 'Não disponível'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status de Aprovação */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4">Status de Aprovação</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleStatusChange('PENDING')}
            className={`px-4 py-2 rounded-md ${
              candidate.status === 'PENDING'
                ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                : 'bg-secondary-100 text-secondary-600 hover:bg-yellow-50 hover:text-yellow-600'
            }`}
          >
            Pendente
          </button>
          <button
            onClick={() => handleStatusChange('APPROVED')}
            className={`px-4 py-2 rounded-md ${
              candidate.status === 'APPROVED'
                ? 'bg-green-100 text-green-800 border-2 border-green-300'
                : 'bg-secondary-100 text-secondary-600 hover:bg-green-50 hover:text-green-600'
            }`}
          >
            Aprovado
          </button>
          <button
            onClick={() => handleStatusChange('REJECTED')}
            className={`px-4 py-2 rounded-md ${
              candidate.status === 'REJECTED'
                ? 'bg-red-100 text-red-800 border-2 border-red-300'
                : 'bg-secondary-100 text-secondary-600 hover:bg-red-50 hover:text-red-600'
            }`}
          >
            Reprovado
          </button>
        </div>
        <div className="mt-6">
          <p className="text-sm text-secondary-500 mb-2">Avaliação</p>
          <Rating
            name="candidate-rating"
            value={candidate.rating || 0}
            precision={0.5}
            onChange={(_, newValue) => handleRatingChange(newValue || 0)}
            size="large"
          />
        </div>
      </div>

      {/* Observações */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4">Observações</h3>
        <textarea
          className="w-full p-3 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={5}
          placeholder="Adicione observações sobre o candidato..."
          value={candidate.observations || ''}
          onChange={handleObservationsChange}
        ></textarea>
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleSaveObservations}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition duration-200"
          >
            Salvar Observações
          </button>
        </div>
      </div>

      {/* Links e Recursos */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4">Links e Recursos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {candidate.linkedin && (
              <div className="mb-4">
                <p className="text-sm text-secondary-500">LinkedIn</p>
                <Link 
                  href={candidate.linkedin.startsWith('http') ? candidate.linkedin : `https://${candidate.linkedin}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-800 font-medium flex items-center"
                >
                  <span>Ver perfil</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            )}
            {candidate.github && (
              <div className="mb-4">
                <p className="text-sm text-secondary-500">GitHub</p>
                <Link 
                  href={candidate.github.startsWith('http') ? candidate.github : `https://${candidate.github}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-800 font-medium flex items-center"
                >
                  <span>Ver repositórios</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            )}
            {candidate.portfolio && (
              <div className="mb-4">
                <p className="text-sm text-secondary-500">Portfólio</p>
                <Link 
                  href={candidate.portfolio.startsWith('http') ? candidate.portfolio : `https://${candidate.portfolio}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-800 font-medium flex items-center"
                >
                  <span>Ver portfólio</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
          <div>
            {candidate.resumeUrl && (
              <div className="mb-4">
                <p className="text-sm text-secondary-500">Currículo</p>
                <Link 
                  href={candidate.resumeUrl}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-800 font-medium flex items-center"
                >
                  <span>Ver currículo</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-1a2 2 0 00-2 2v3a2 2 0 002 2h3a2 2 0 002-2V7a1 1 0 10-2 0v3a1 1 0 10-2 0V7a1 1 0 10-2 0v3a2 2 0 002 2h3z" />
                  </svg>
                </Link>
              </div>
            )}
            {candidate.infoJobsLink && (
              <div className="mb-4">
                <p className="text-sm text-secondary-500">InfoJobs</p>
                <Link 
                  href={candidate.infoJobsLink}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-800 font-medium flex items-center"
                >
                  <span>Ver perfil InfoJobs</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            )}
            {candidate.socialMediaUrl && (
              <div className="mb-4">
                <p className="text-sm text-secondary-500">Redes Sociais</p>
                <Link 
                  href={candidate.socialMediaUrl.startsWith('http') ? candidate.socialMediaUrl : `https://${candidate.socialMediaUrl}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-800 font-medium flex items-center"
                >
                  <span>Ver perfil social</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compartilhamento de Convite */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4">Compartilhar Convite</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="bg-white p-3 rounded-md border border-secondary-200">
              <span className="text-sm text-secondary-600">Código do Convite:</span>
              <div className="flex items-center justify-between mt-1">
                <p className="font-medium text-lg text-primary-600">{candidate?.inviteCode}</p>
                <button
                  onClick={generateNewInvite}
                  disabled={isGeneratingInvite}
                  className="text-xs px-2 py-1 bg-secondary-100 text-secondary-700 rounded hover:bg-secondary-200 transition duration-200"
                >
                  {isGeneratingInvite ? 'Gerando...' : 'Gerar Novo'}
                </button>
              </div>
            </div>
            {candidate.inviteExpires && (
              <div className="mt-2 text-xs text-secondary-500">
                Expira em: {format(new Date(candidate.inviteExpires), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={sendInviteByEmail}
              className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              Enviar por Email
            </button>
            <button
              onClick={shareByWhatsApp}
              className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              Compartilhar via WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoTab;
