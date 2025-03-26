import React, { useState } from 'react';
import { QuestionType } from '../../types/questions';

interface AddStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, description: string, questionType: string) => void;
}

const AddStageModal: React.FC<AddStageModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [newStageName, setNewStageName] = useState<string>('');
  const [newStageDescription, setNewStageDescription] = useState<string>('');
  const [newStageQuestionType, setNewStageQuestionType] = useState<string>('');

  const handleAddStage = () => {
    if (!newStageName.trim()) {
      // Poderia adicionar uma validação mais robusta aqui
      alert('Por favor, insira um nome para a etapa');
      return;
    }

    if (!newStageQuestionType) {
      alert('Por favor, selecione um tipo de pergunta');
      return;
    }

    onAdd(newStageName, newStageDescription, newStageQuestionType);
    resetForm();
  };

  const resetForm = () => {
    setNewStageName('');
    setNewStageDescription('');
    setNewStageQuestionType('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Adicionar Etapa ao Teste</h2>
        
        <div className="mb-4">
          <label htmlFor="stageName" className="block text-sm font-medium text-secondary-700 mb-1">
            Nome da Etapa *
          </label>
          <input
            type="text"
            id="stageName"
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="Digite o nome da etapa"
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="stageDescription" className="block text-sm font-medium text-secondary-700 mb-1">
            Descrição
          </label>
          <textarea
            id="stageDescription"
            value={newStageDescription}
            onChange={(e) => setNewStageDescription(e.target.value)}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="Digite a descrição da etapa (opcional)"
            rows={3}
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="stageQuestionType" className="block text-sm font-medium text-secondary-700 mb-1">
            Tipo de Pergunta *
          </label>
          <select
            id="stageQuestionType"
            value={newStageQuestionType}
            onChange={(e) => {
              const selectedType = e.target.value;
              setNewStageQuestionType(selectedType);
              
              // Preencher descrição automaticamente para perguntas opinativas
              if (selectedType === QuestionType.OPINION_MULTIPLE) {
                setNewStageDescription("Nessa etapa não existe resposta errada, Todas a respostas estão certas. Escolha a alternativa que você concorda mais ou que está mais perto do que você faria");
              }
            }}
            className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Selecione o tipo de pergunta</option>
            {Object.entries(QuestionType).map(([key, value]) => (
              <option key={key} value={value}>
                {key === 'MULTIPLE_CHOICE' ? 'Múltipla escolha' : 
                 key === 'OPINION_MULTIPLE' ? 'Opinativa' : key}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="px-4 py-2 text-sm text-secondary-600 border border-secondary-300 rounded-md hover:bg-secondary-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleAddStage}
            className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddStageModal;
