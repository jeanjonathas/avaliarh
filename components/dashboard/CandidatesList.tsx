import React from 'react';
import Link from 'next/link';

interface Candidate {
  id: string;
  name: string;
  email: string;
  position?: string;
  completed: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rating?: number;
  stageScores?: {
    id: string;
    name: string;
    correct: number;
    total: number;
    percentage: number;
  }[];
}

interface CandidatesListProps {
  candidates: Candidate[];
  onViewCandidate: (candidate: Candidate) => void;
  calculateCompatibility: (candidate: Candidate) => number;
}

const CandidatesList: React.FC<CandidatesListProps> = ({ 
  candidates, 
  onViewCandidate,
  calculateCompatibility
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-secondary-200">
        <h3 className="text-lg font-semibold text-secondary-700">Candidatos Recentes</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-secondary-200">
          <thead className="bg-secondary-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Candidato
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Cargo
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Pontuação
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Situação
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Avaliação
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Compatibilidade
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-secondary-200">
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-secondary-500">
                  Nenhum candidato encontrado
                </td>
              </tr>
            ) : (
              candidates.slice(0, 5).map((candidate, index) => (
                <tr key={candidate.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-secondary-50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-secondary-900">{candidate.name}</div>
                        <div className="text-sm text-secondary-500">{candidate.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-secondary-900">{candidate.position || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {candidate.completed ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Completo
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Incompleto
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {candidate.stageScores && candidate.stageScores.length > 0 ? 
                      (() => {
                        const totalCorrect = candidate.stageScores.reduce((acc, stage) => acc + stage.correct, 0);
                        const totalQuestions = candidate.stageScores.reduce((acc, stage) => acc + stage.total, 0);
                        return totalQuestions > 0 ? `${Math.round((totalCorrect / totalQuestions) * 100)}%` : 0;
                      })() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {candidate.status === 'APPROVED' && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Aprovado
                        </span>
                      )}
                      {candidate.status === 'REJECTED' && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Reprovado
                        </span>
                      )}
                      {candidate.status === 'PENDING' && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pendente
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {candidate.rating ? (
                      <div className="flex text-yellow-500">
                        {[...Array(5)].map((_, i) => {
                          const starValue = i + 1;
                          const ratingValue = candidate.rating;
                          const isHalfStar = ratingValue === starValue - 0.5;
                          const isFullStar = ratingValue >= starValue;
                          
                          return (
                            <div key={i} className="relative">
                              {/* Estrela completa ou vazia */}
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className={`h-5 w-5 ${isFullStar ? 'text-yellow-500' : 'text-gray-300'}`}
                                fill="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                              </svg>
                              
                              {/* Renderizar meia estrela */}
                              {isHalfStar && (
                                <div className="absolute top-0 left-0 w-1/2 h-full overflow-hidden">
                                  <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    className="h-5 w-5 text-yellow-500"
                                    fill="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-sm text-secondary-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                    {calculateCompatibility(candidate)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                    <button
                      onClick={() => onViewCandidate(candidate)}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 border-t border-secondary-200">
        <Link 
          href="/admin/candidates"
          className="text-primary-600 hover:text-primary-800 font-medium"
        >
          Ver todos os candidatos →
        </Link>
      </div>
    </div>
  );
};

export default CandidatesList;
