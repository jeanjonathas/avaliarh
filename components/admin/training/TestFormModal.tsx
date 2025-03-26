import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import axios from 'axios';
import { ClockIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

interface TestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  test?: {
    id: string;
    name: string;
    description: string;
    timeLimit: number;
    passingScore: number;
  };
}

const TestFormModal: React.FC<TestFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  courseId,
  moduleId,
  lessonId,
  test
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [passingScore, setPassingScore] = useState(70);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Determine the test level (course, module, or lesson)
  const getTestLevel = () => {
    if (lessonId) return 'lesson';
    if (moduleId) return 'module';
    if (courseId) return 'course';
    return null;
  };
  
  const getTestLevelId = () => {
    if (lessonId) return lessonId;
    if (moduleId) return moduleId;
    if (courseId) return courseId;
    return null;
  };

  useEffect(() => {
    if (test) {
      setName(test.name);
      setDescription(test.description);
      setTimeLimit(test.timeLimit);
      setPassingScore(test.passingScore);
    } else {
      // Reset form for new test
      setName('');
      setDescription('');
      setTimeLimit(30);
      setPassingScore(70);
    }
    setError('');
  }, [test, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!name.trim()) {
      setError('O nome do teste é obrigatório');
      setLoading(false);
      return;
    }

    const testLevel = getTestLevel();
    const testLevelId = getTestLevelId();
    
    if (!testLevel || !testLevelId) {
      setError('É necessário associar o teste a um curso, módulo ou Aula');
      setLoading(false);
      return;
    }

    try {
      if (test) {
        // Update existing test
        await axios.put(`/api/admin/training/tests/${test.id}`, {
          name,
          description,
          timeLimit,
          passingScore
        });
      } else {
        // Create new test
        await axios.post('/api/admin/training/tests', {
          name,
          description,
          timeLimit,
          passingScore,
          level: testLevel,
          levelId: testLevelId
        });
      }
      
      setLoading(false);
      onSave();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.error || 'Ocorreu um erro ao salvar o teste');
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
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <Dialog.Title
                as="h3"
                className="text-lg font-medium leading-6 text-gray-900"
              >
                {test ? 'Editar Teste' : 'Novo Teste'}
              </Dialog.Title>
              
              {error && (
                <div className="mt-2 p-2 bg-red-50 text-red-700 rounded">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="mt-4">
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Nome do Teste *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Descrição
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700">
                    Tempo Limite (minutos)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ClockIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      type="number"
                      id="timeLimit"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                      min="1"
                      className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">min</span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Defina 0 para não ter limite de tempo
                  </p>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="passingScore" className="block text-sm font-medium text-gray-700">
                    Nota Mínima para Aprovação (%)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <AcademicCapIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      type="number"
                      id="passingScore"
                      value={passingScore}
                      onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)}
                      min="0"
                      max="100"
                      className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">%</span>
                    </div>
                  </div>
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

export default TestFormModal;
