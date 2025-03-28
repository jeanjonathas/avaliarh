import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import AdminLayout from '../../../components/admin/AdminLayout';
import QuestionList from '../../../components/admin/QuestionList';
import { Button } from '../../../components/ui/Button';
import { QuestionType } from '../../../types/questions';
import Modal from '../../../components/ui/Modal';
import QuestionExportImport from '../../../components/QuestionExportImport';

const QuestionsPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    // Verificar autenticação
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      setLoading(false);
      // Carregar perguntas e categorias para exportação
      const fetchData = async () => {
        try {
          const questionsRes = await fetch('/api/admin/questions');
          const categoriesRes = await fetch('/api/admin/categories');
          
          if (questionsRes.ok && categoriesRes.ok) {
            const questionsData = await questionsRes.json();
            const categoriesData = await categoriesRes.json();
            
            console.log('Dados de questões recebidos:', questionsData);
            
            // Verificar a estrutura dos dados recebidos
            let formattedQuestions = [];
            if (Array.isArray(questionsData)) {
              formattedQuestions = questionsData;
            } else if (questionsData.questions && Array.isArray(questionsData.questions)) {
              formattedQuestions = questionsData.questions;
            } else if (typeof questionsData === 'object') {
              formattedQuestions = [questionsData];
            }
            
            console.log('Questões formatadas:', formattedQuestions);
            setQuestions(formattedQuestions);
            setCategories(categoriesData);
          }
        } catch (error) {
          console.error('Erro ao carregar dados:', error);
        }
      };
      
      fetchData();
    }
  }, [status, router]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </AdminLayout>
    );
  }

  const handleAddQuestion = (type: QuestionType) => {
    setShowAddModal(false);
    if (type === QuestionType.MULTIPLE_CHOICE) {
      router.push('/admin/questions/add');
    } else if (type === QuestionType.OPINION_MULTIPLE) {
      router.push('/admin/questions/add-opinion');
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Gerenciar Perguntas</h1>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <QuestionExportImport
              questions={questions}
              categories={categories}
              onImportSuccess={(newQuestions) => {
                setQuestions([...questions, ...newQuestions]);
              }}
            />
            <Button 
              variant="primary" 
              onClick={() => setShowAddModal(true)}
              className="flex items-center w-full sm:w-auto justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Adicionar Pergunta
            </Button>
          </div>
        </div>

        {/* Lista de perguntas com filtros */}
        <QuestionList />

        {/* Modal para escolher o tipo de pergunta */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Adicionar Nova Pergunta"
        >
          <div className="p-4">
            <p className="text-gray-600 mb-4">Selecione o tipo de pergunta que deseja criar:</p>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <button
                onClick={() => handleAddQuestion(QuestionType.MULTIPLE_CHOICE)}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors flex flex-col items-center"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-800">Múltipla Escolha</h3>
                <p className="text-sm text-gray-500 text-center mt-1">
                  Perguntas com respostas corretas e incorretas
                </p>
              </button>
              
              <button
                onClick={() => handleAddQuestion(QuestionType.OPINION_MULTIPLE)}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors flex flex-col items-center"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-800">Pergunta Opinativa</h3>
                <p className="text-sm text-gray-500 text-center mt-1">
                  Perguntas que mapeiam opiniões e personalidades
                </p>
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default QuestionsPage;
