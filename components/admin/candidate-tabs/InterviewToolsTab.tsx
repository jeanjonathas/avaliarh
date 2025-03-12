import React, { useState } from 'react';
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
  stageScores?: StageScore[];
  score?: number;
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

interface StageScore {
  id: string;
  name: string;
  percentage: number;
  correct: number;
  total: number;
}

interface InterviewToolsTabProps {
  candidate: Candidate;
  handleRatingChange: (rating: number) => void;
  handleObservationsChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSaveObservations: () => void;
}

const InterviewToolsTab: React.FC<InterviewToolsTabProps> = ({
  candidate,
  handleRatingChange,
  handleObservationsChange,
  handleSaveObservations
}) => {
  const [interviewNotes, setInterviewNotes] = useState<string[]>([]);
  const [currentNote, setCurrentNote] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sugestões de perguntas para entrevista baseadas no cargo (se disponível)
  const getInterviewQuestionSuggestions = () => {
    const defaultQuestions = [
      "Fale sobre sua experiência anterior e como ela se relaciona com essa vaga.",
      "Quais são seus pontos fortes e fracos?",
      "Como você lida com prazos apertados e pressão?",
      "Por que você está interessado nesta posição?",
      "Onde você se vê em 5 anos?",
      "Como você lidou com um conflito no trabalho?",
      "Qual foi seu maior desafio profissional e como o superou?",
      "Como você se mantém atualizado em sua área?",
    ];

    // Se tiver cargo, adicionar perguntas específicas
    if (candidate.position) {
      const position = candidate.position.toLowerCase();
      
      if (position.includes('desenvolv') || position.includes('program') || position.includes('dev')) {
        return [
          ...defaultQuestions,
          "Descreva um projeto complexo que você desenvolveu e quais tecnologias utilizou.",
          "Como você aborda a documentação de código?",
          "Como você lida com requisitos que mudam frequentemente?",
          "Explique como você implementaria um sistema de cache para melhorar a performance.",
          "Qual sua experiência com metodologias ágeis?",
        ];
      }
      
      if (position.includes('design') || position.includes('ux') || position.includes('ui')) {
        return [
          ...defaultQuestions,
          "Como você equilibra estética e usabilidade em seus designs?",
          "Descreva seu processo de design do início ao fim.",
          "Como você incorpora feedback dos usuários em seus designs?",
          "Quais ferramentas de design você utiliza e por quê?",
          "Como você se mantém atualizado sobre tendências de design?",
        ];
      }
    }
    
    return defaultQuestions;
  };

  const addNote = () => {
    if (currentNote.trim()) {
      setInterviewNotes([...interviewNotes, currentNote.trim()]);
      setCurrentNote('');
    }
  };

  const removeNote = (index: number) => {
    const updatedNotes = [...interviewNotes];
    updatedNotes.splice(index, 1);
    setInterviewNotes(updatedNotes);
  };

  const selectSuggestion = (suggestion: string) => {
    setCurrentNote(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-8">
      {/* Avaliação do Candidato */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4">Avaliação do Candidato</h3>
        <div className="mb-6">
          <p className="text-sm text-secondary-500 mb-2">Classificação (5 estrelas)</p>
          <div className="flex items-center">
            <Rating
              name="candidate-rating"
              value={candidate.rating || 0}
              precision={0.5}
              onChange={(_, newValue) => handleRatingChange(newValue || 0)}
              size="large"
            />
            <span className="ml-2 text-secondary-600">
              {candidate.rating ? `${candidate.rating} de 5` : 'Não avaliado'}
            </span>
          </div>
        </div>
        
        <div>
          <p className="text-sm text-secondary-500 mb-2">Observações da Entrevista</p>
          <textarea
            className="w-full p-3 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={5}
            placeholder="Adicione observações sobre o candidato durante a entrevista..."
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
      </div>

      {/* Anotações Rápidas */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4">Anotações Rápidas</h3>
        <div className="mb-4">
          <div className="flex">
            <input
              type="text"
              className="flex-grow p-3 border border-secondary-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Adicione uma anotação rápida..."
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNote()}
            />
            <button
              onClick={addNote}
              className="px-4 py-2 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 transition duration-200"
            >
              Adicionar
            </button>
          </div>
          <div className="mt-2">
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              {showSuggestions ? 'Ocultar sugestões' : 'Mostrar sugestões de perguntas'}
            </button>
          </div>
          
          {/* Sugestões de perguntas */}
          {showSuggestions && (
            <div className="mt-3 bg-secondary-50 p-3 rounded-md">
              <p className="text-sm font-medium text-secondary-700 mb-2">Sugestões de perguntas:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {getInterviewQuestionSuggestions().map((suggestion, index) => (
                  <div 
                    key={index}
                    className="p-2 bg-white rounded border border-secondary-200 hover:bg-primary-50 cursor-pointer"
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Lista de anotações */}
        {interviewNotes.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-secondary-700 mb-2">Anotações da entrevista:</p>
            <ul className="space-y-2">
              {interviewNotes.map((note, index) => (
                <li key={index} className="flex items-start p-3 bg-secondary-50 rounded-md">
                  <span className="flex-grow">{note}</span>
                  <button
                    onClick={() => removeNote(index)}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Resumo do Desempenho */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4">Resumo do Desempenho</h3>
        
        {candidate.stageScores && candidate.stageScores.length > 0 ? (
          <div className="space-y-4">
            <p className="text-secondary-600">Pontuação por etapa:</p>
            <div className="space-y-3">
              {candidate.stageScores.map((stage) => (
                <div key={stage.id} className="flex items-center">
                  <div className="w-1/3 font-medium text-secondary-700">{stage.name}</div>
                  <div className="w-2/3">
                    <div className="relative pt-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold inline-block text-primary-600">
                            {stage.percentage}%
                          </span>
                        </div>
                        <div className="text-xs text-secondary-500">
                          {stage.correct} de {stage.total} corretas
                        </div>
                      </div>
                      <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-secondary-200">
                        <div
                          style={{ width: `${stage.percentage}%` }}
                          className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                            stage.percentage >= 70
                              ? 'bg-green-500'
                              : stage.percentage >= 40
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-secondary-200">
              <div className="flex items-center">
                <div className="w-1/3 font-medium text-secondary-700">Pontuação Total</div>
                <div className="w-2/3">
                  <div className="relative pt-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block text-primary-600">
                          {candidate.score !== undefined ? `${candidate.score.toFixed(1)}%` : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-secondary-200">
                      <div
                        style={{ width: `${candidate.score || 0}%` }}
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                          (candidate.score || 0) >= 70
                            ? 'bg-green-500'
                            : (candidate.score || 0) >= 40
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-secondary-500">Nenhum dado de desempenho disponível.</p>
        )}
      </div>
    </div>
  );
};

export default InterviewToolsTab;
