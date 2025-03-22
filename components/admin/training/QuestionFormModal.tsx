import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import axios from 'axios';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Option {
  id?: string;
  text: string;
  isCorrect: boolean;
}

interface QuestionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  testId: string;
  question?: {
    id: string;
    text: string;
    points: number;
    options: Option[];
  };
}

const QuestionFormModal: React.FC<QuestionFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  testId,
  question
}) => {
  const [text, setText] = useState('');
  const [points, setPoints] = useState(1);
  const [options, setOptions] = useState<Option[]>([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false }
  ]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (question) {
      setText(question.text);
      setPoints(question.points);
      // Ensure we have at least 4 options
      const questionOptions = [...question.options];
      while (questionOptions.length < 4) {
        questionOptions.push({ text: '', isCorrect: false });
      }
      setOptions(questionOptions);
    } else {
      // Reset form for new question
      setText('');
      setPoints(1);
      setOptions([
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]);
    }
    setError('');
  }, [question, isOpen]);

  const handleOptionChange = (index: number, field: keyof Option, value: string | boolean) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    
    // If setting this option as correct, make sure other options are not correct
    if (field === 'isCorrect' && value === true) {
      newOptions.forEach((option, i) => {
        if (i !== index) {
          newOptions[i] = { ...newOptions[i], isCorrect: false };
        }
      });
    }
    
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, { text: '', isCorrect: false }]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) {
      setError('Uma questão deve ter pelo menos 2 opções');
      return;
    }
    
    const newOptions = [...options];
    newOptions.splice(index, 1);
    
    // If we removed the correct option, make the first option correct
    if (options[index].isCorrect && newOptions.every(o => !o.isCorrect)) {
      newOptions[0] = { ...newOptions[0], isCorrect: true };
    }
    
    setOptions(newOptions);
  };

  const validateForm = () => {
    if (!text.trim()) {
      setError('O texto da questão é obrigatório');
      return false;
    }
    
    // Filter out empty options
    const validOptions = options.filter(o => o.text.trim());
    
    if (validOptions.length < 2) {
      setError('A questão deve ter pelo menos 2 opções válidas');
      return false;
    }
    
    if (!validOptions.some(o => o.isCorrect)) {
      setError('Pelo menos uma opção deve ser marcada como correta');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    // Filter out empty options
    const validOptions = options.filter(o => o.text.trim());

    try {
      if (question) {
        // Update existing question
        await axios.put(`/api/admin/training/questions/${question.id}`, {
          text,
          points,
          options: validOptions,
          testId
        });
      } else {
        // Create new question
        await axios.post('/api/admin/training/questions', {
          text,
          points,
          options: validOptions,
          testId
        });
      }
      
      setLoading(false);
      onSave();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.error || 'Ocorreu um erro ao salvar a questão');
    }
  };

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-10 overflow-y-auto"
        onClose={onClose}
      >
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black opacity-30" />
          </Transition.Child>

          <span
            className="inline-block h-screen align-middle"
            aria-hidden="true"
          >
            &#8203;
          </span>
          
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <Dialog.Title
                as="h3"
                className="text-lg font-medium leading-6 text-gray-900"
              >
                {question ? 'Editar Questão' : 'Nova Questão'}
              </Dialog.Title>
              
              {error && (
                <div className="mt-2 p-2 bg-red-50 text-red-700 rounded">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="mt-4">
                <div className="mb-4">
                  <label htmlFor="text" className="block text-sm font-medium text-gray-700">
                    Texto da Questão *
                  </label>
                  <textarea
                    id="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="points" className="block text-sm font-medium text-gray-700">
                    Pontos
                  </label>
                  <input
                    type="number"
                    id="points"
                    value={points}
                    onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
                    min="1"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-700">
                      Opções *
                    </label>
                    <button
                      type="button"
                      onClick={addOption}
                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Adicionar Opção
                    </button>
                  </div>
                  
                  <div className="mt-2 space-y-3">
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="flex-grow">
                          <div className="relative rounded-md shadow-sm">
                            <input
                              type="text"
                              value={option.text}
                              onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                              placeholder={`Opção ${index + 1}`}
                              className="block w-full pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            type="radio"
                            checked={option.isCorrect}
                            onChange={() => handleOptionChange(index, 'isCorrect', true)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                          />
                          <label className="ml-2 text-sm text-gray-700">
                            Correta
                          </label>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="inline-flex items-center p-1 border border-transparent rounded-full text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <p className="mt-1 text-xs text-gray-500">
                    Uma questão deve ter pelo menos 2 opções e uma delas deve ser marcada como correta.
                  </p>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default QuestionFormModal;
