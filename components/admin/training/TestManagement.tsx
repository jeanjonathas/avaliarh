import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { PlusIcon, PencilIcon, TrashIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import TestFormModal from './TestFormModal';
import DeleteTestModal from './DeleteTestModal';
import QuestionFormModal from './QuestionFormModal';
import DeleteQuestionModal from './DeleteQuestionModal';

interface Option {
  id?: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  points: number;
  options: Option[];
}

interface Test {
  id: string;
  name: string;
  description: string;
  timeLimit: number;
  passingScore: number;
  questionCount?: number;
  questions?: Question[];
}

interface TestManagementProps {
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  title: string;
}

const TestManagement: React.FC<TestManagementProps> = ({
  courseId,
  moduleId,
  lessonId,
  title
}) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isTestFormOpen, setIsTestFormOpen] = useState(false);
  const [isDeleteTestOpen, setIsDeleteTestOpen] = useState(false);
  const [isQuestionFormOpen, setIsQuestionFormOpen] = useState(false);
  const [isDeleteQuestionOpen, setIsDeleteQuestionOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  // Determine the test level (course, module, or lesson)
  const getTestLevel = useCallback(() => {
    if (lessonId) return 'lesson';
    if (moduleId) return 'module';
    if (courseId) return 'course';
    return null;
  }, [lessonId, moduleId, courseId]);
  
  const getTestLevelId = useCallback(() => {
    if (lessonId) return lessonId;
    if (moduleId) return moduleId;
    if (courseId) return courseId;
    return null;
  }, [lessonId, moduleId, courseId]);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    setError('');
    
    const level = getTestLevel();
    const levelId = getTestLevelId();
    
    if (!level || !levelId) {
      setError('Nível inválido para buscar testes');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get('/api/admin/training/tests', {
        params: { level, levelId }
      });
      setTests(response.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar testes');
      setLoading(false);
    }
  }, [getTestLevel, getTestLevelId]);

  const fetchTestDetails = async (testId: string) => {
    try {
      const response = await axios.get(`/api/admin/training/tests/${testId}`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar detalhes do teste');
      return null;
    }
  };

  const handleExpandTest = async (testId: string) => {
    if (expandedTestId === testId) {
      setExpandedTestId(null);
      return;
    }
    
    setExpandedTestId(testId);
    const testDetails = await fetchTestDetails(testId);
    
    if (testDetails) {
      setTests(prevTests => 
        prevTests.map(test => 
          test.id === testId ? { ...test, questions: testDetails.questions } : test
        )
      );
    }
  };

  const handleCreateTest = () => {
    setSelectedTest(null);
    setIsTestFormOpen(true);
  };

  const handleEditTest = (test: Test) => {
    setSelectedTest(test);
    setIsTestFormOpen(true);
  };

  const handleDeleteTest = (test: Test) => {
    setSelectedTest(test);
    setIsDeleteTestOpen(true);
  };

  const handleCreateQuestion = (testId: string) => {
    setSelectedQuestion(null);
    setSelectedTest(tests.find(t => t.id === testId) || null);
    setIsQuestionFormOpen(true);
  };

  const handleEditQuestion = (question: Question, testId: string) => {
    setSelectedQuestion(question);
    setSelectedTest(tests.find(t => t.id === testId) || null);
    setIsQuestionFormOpen(true);
  };

  const handleDeleteQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setIsDeleteQuestionOpen(true);
  };

  const handleTestSaved = () => {
    fetchTests();
  };

  const handleTestDeleted = () => {
    fetchTests();
  };

  const handleQuestionSaved = () => {
    if (selectedTest && expandedTestId === selectedTest.id) {
      handleExpandTest(selectedTest.id);
    }
    fetchTests();
  };

  const handleQuestionDeleted = () => {
    if (selectedTest && expandedTestId === selectedTest.id) {
      handleExpandTest(selectedTest.id);
    }
    fetchTests();
  };

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        <button
          onClick={handleCreateTest}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="h-5 w-5 mr-1" />
          Novo Teste
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-gray-500">Carregando testes...</div>
      ) : tests.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          Nenhum teste encontrado. Clique em &quot;Novo Teste&quot; para criar o primeiro.
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => (
            <div key={test.id} className="border rounded-lg overflow-hidden">
              <div 
                className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer"
                onClick={() => handleExpandTest(test.id)}
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{test.name}</h3>
                  <div className="mt-1 flex items-center text-sm text-gray-500">
                    <span className="mr-4">Tempo: {test.timeLimit} min</span>
                    <span className="mr-4">Nota mínima: {test.passingScore}%</span>
                    <span>{test.questionCount || 0} questões</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTest(test);
                    }}
                    className="p-1 rounded-full text-gray-500 hover:bg-gray-200 focus:outline-none"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTest(test);
                    }}
                    className="p-1 rounded-full text-red-500 hover:bg-red-100 focus:outline-none"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {expandedTestId === test.id && (
                <div className="p-4 border-t">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-gray-700">Questões</h4>
                    <button
                      onClick={() => handleCreateQuestion(test.id)}
                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Nova Questão
                    </button>
                  </div>

                  {!test.questions || test.questions.length === 0 ? (
                    <div className="py-4 text-center text-gray-500">
                      Nenhuma questão encontrada. Adicione a primeira questão.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {test.questions.map((question) => (
                        <div key={question.id} className="bg-gray-50 p-3 rounded-md">
                          <div className="flex justify-between">
                            <div className="flex items-start">
                              <QuestionMarkCircleIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-gray-700">{question.text}</p>
                                <p className="text-xs text-gray-500 mt-1">Pontos: {question.points}</p>
                                
                                <div className="mt-2 space-y-1">
                                  {question.options.map((option, index) => (
                                    <div key={index} className="flex items-center">
                                      <div className={`h-3 w-3 rounded-full mr-2 ${option.isCorrect ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                      <span className="text-xs text-gray-600">{option.text}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-start space-x-1">
                              <button
                                onClick={() => handleEditQuestion(question, test.id)}
                                className="p-1 rounded-full text-gray-500 hover:bg-gray-200 focus:outline-none"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteQuestion(question)}
                                className="p-1 rounded-full text-red-500 hover:bg-red-100 focus:outline-none"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <TestFormModal
        isOpen={isTestFormOpen}
        onClose={() => setIsTestFormOpen(false)}
        onSave={handleTestSaved}
        courseId={courseId}
        moduleId={moduleId}
        lessonId={lessonId}
        test={selectedTest || undefined}
      />

      {selectedTest && (
        <DeleteTestModal
          isOpen={isDeleteTestOpen}
          onClose={() => setIsDeleteTestOpen(false)}
          onDelete={handleTestDeleted}
          test={selectedTest}
        />
      )}

      {selectedTest && (
        <QuestionFormModal
          isOpen={isQuestionFormOpen}
          onClose={() => setIsQuestionFormOpen(false)}
          onSave={handleQuestionSaved}
          testId={selectedTest.id}
          question={selectedQuestion || undefined}
        />
      )}

      {selectedQuestion && (
        <DeleteQuestionModal
          isOpen={isDeleteQuestionOpen}
          onClose={() => setIsDeleteQuestionOpen(false)}
          onDelete={handleQuestionDeleted}
          question={selectedQuestion}
        />
      )}
    </div>
  );
};

export default TestManagement;
