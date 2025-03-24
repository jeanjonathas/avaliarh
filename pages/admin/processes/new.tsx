import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import AdminLayout from '../../../components/admin/AdminLayout';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Switch, FormControlLabel, FormGroup } from '@mui/material';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import PersonalityTraitWeightConfig from '../../../components/admin/PersonalityTraitWeightConfig';

interface ProcessStage {
  name: string;
  description?: string;
  order: number;
  type: string;
  testId?: string;
  requestCandidatePhoto?: boolean;
  showResultsToCandidate?: boolean;
  personalityTraits?: {
    id: string;
    traitName: string;
    weight: number;
    order: number;
  }[];
}

interface FormDraft {
  name: string;
  description?: string;
  evaluationType: string;
  cutoffScore?: number;
  jobPosition: string;
  stages: ProcessStage[];
}

interface FormData {
  name: string;
  description?: string;
  cutoffScore?: number;
  evaluationType: string;
  jobPosition: string;
  stages: ProcessStage[];
}

interface Test {
  id: string;
  title: string;
  description?: string;
  sectionsCount?: number;
  questionsCount?: number;
  stages?: {
    id: string;
    title: string;
    description?: string;
    questions?: {
      id: string;
      text: string;
      type?: string;
    }[];
  }[];
}

interface TestStage {
  id: string;
  title: string;
  description?: string;
  questions?: {
    id: string;
    text: string;
    type?: string;
  }[];
}

interface TestQuestion {
  id: string;
  text: string;
  type?: string;
}

const stageTypes = [
  { value: 'TEST', label: 'Teste' },
  { value: 'INTERVIEW', label: 'Entrevista' },
  { value: 'TECHNICAL', label: 'Avaliação Técnica' },
  { value: 'GROUP_DYNAMIC', label: 'Dinâmica em Grupo' }
];

const NewProcess: React.FC = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});

  const { control, handleSubmit, register, formState: { errors }, watch, setValue, reset } = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
      evaluationType: 'SCORE_BASED',
      cutoffScore: 70,
      jobPosition: '',
      stages: [
        {
          name: '',
          description: '',
          order: 1,
          type: 'TEST',
          testId: '',
          requestCandidatePhoto: true,
          showResultsToCandidate: true,
          personalityTraits: [],
        }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'stages'
  });

  useEffect(() => {
    // Buscar testes disponíveis
    const fetchTests = async () => {
      try {
        setIsLoadingTests(true);
        const response = await fetch('/api/admin/tests?testType=selection');
        if (response.ok) {
          const { tests: testsData } = await response.json();
          setTests(testsData.map(test => ({
            id: test.id,
            title: test.title,
            description: test.description,
            sectionsCount: test.sectionsCount || 0,
            questionsCount: test.questionsCount || 0,
            stages: test.stages?.map(stage => ({
              id: stage.id,
              title: stage.title,
              description: stage.description,
              questions: stage.questions?.map(question => ({
                id: question.id,
                text: question.text,
                type: question.type
              }))
            }))
          })));
        }
      } catch (error) {
        console.error('Erro ao carregar testes:', error);
        toast.error('Erro ao carregar testes');
      } finally {
        setIsLoadingTests(false);
      }
    };

    fetchTests();
  }, []);

  // Função para adicionar uma nova etapa
  const addStage = () => {
    append({
      name: '',
      description: '',
      order: fields.length + 1,
      type: 'TEST',
      testId: '',
      requestCandidatePhoto: true,
      showResultsToCandidate: true,
      personalityTraits: [],
    });
  };

  // Função para remover uma etapa
  const removeStage = (index: number) => {
    remove(index);
  };

  // Função para alternar a expansão de um teste
  const toggleTestExpansion = async (testId: string) => {
    // Se já estiver expandido, apenas recolhe
    if (expandedTests[testId]) {
      setExpandedTests(prev => ({
        ...prev,
        [testId]: false
      }));
      return;
    }
    
    // Se não estiver expandido, busca os detalhes do teste
    try {
      // Verificar se já temos os detalhes do teste
      const testWithDetails = tests.find(t => t.id === testId);
      if (testWithDetails && testWithDetails.stages && testWithDetails.stages.length > 0) {
        // Se já temos os detalhes, apenas expande
        setExpandedTests(prev => ({
          ...prev,
          [testId]: true
        }));
        return;
      }
      
      // Buscar detalhes do teste
      const response = await fetch(`/api/admin/tests/${testId}`);
      if (response.ok) {
        const testDetails = await response.json();
        
        // Atualizar o teste na lista com os detalhes
        setTests(prevTests => 
          prevTests.map(test => 
            test.id === testId 
              ? { 
                  ...test, 
                  stages: testDetails.stages || [] 
                } 
              : test
          )
        );
      }
      
      // Expandir o teste
      setExpandedTests(prev => ({
        ...prev,
        [testId]: true
      }));
    } catch (error) {
      console.error('Erro ao buscar detalhes do teste:', error);
      toast.error('Erro ao carregar detalhes do teste');
    }
  };

  useEffect(() => {
    // Limpar rascunho e inicializar formulário ao montar o componente
    // Limpar qualquer rascunho anterior ao acessar a página de novo processo
    localStorage.removeItem('processDraft');
    
    // Inicializar o formulário com valores padrão
    reset({
      name: '',
      description: '',
      evaluationType: 'SCORE_BASED',
      cutoffScore: 70,
      jobPosition: '',
      stages: [{
        name: '',
        description: '',
        order: 1,
        type: 'TEST',
        testId: '',
        requestCandidatePhoto: true,
        showResultsToCandidate: true,
        personalityTraits: [],
      }]
    });
  }, [reset]);

  // Recuperar rascunho apenas quando retornar da página de teste
  useEffect(() => {
    // Verificar se estamos retornando da página de teste
    const isReturningFromTest = router.query.from === 'test';
    
    if (isReturningFromTest) {
      const draft = localStorage.getItem('processDraft');
      if (draft) {
        try {
          const draftData = JSON.parse(draft) as FormDraft;
          
          // Atualizar os campos do formulário com os dados do rascunho
          reset({
            name: draftData.name || '',
            description: draftData.description || '',
            evaluationType: draftData.evaluationType || 'SCORE_BASED',
            cutoffScore: draftData.cutoffScore || 70,
            jobPosition: draftData.jobPosition || '',
            stages: draftData.stages?.length > 0 ? draftData.stages.map(stage => ({
              ...stage,
              personalityTraits: stage.personalityTraits || []
            })) : [{
              name: '',
              description: '',
              order: 1,
              type: 'TEST',
              testId: '',
              requestCandidatePhoto: true,
              showResultsToCandidate: true,
              personalityTraits: [],
            }]
          });
        } catch (error) {
          console.error('Erro ao carregar rascunho:', error);
          localStorage.removeItem('processDraft');
        }
      }
    }
  }, [router.query.from, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);

      const response = await fetch('/api/admin/processes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('Processo seletivo criado com sucesso!');
        localStorage.removeItem('processDraft'); // Limpar rascunho após salvar
        router.push('/admin/processes');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao criar processo seletivo');
      }
    } catch (error) {
      console.error('Erro ao criar processo seletivo:', error);
      toast.error('Erro ao criar processo seletivo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-semibold text-secondary-900 mb-6">
            Novo Processo Seletivo
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Nome do Processo *
              </label>
              <input
                type="text"
                placeholder="Ex: Desenvolvedor Full Stack 2024"
                {...register('name', { required: 'Nome é obrigatório' })}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">Nome é obrigatório</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Cargo *
              </label>
              <input
                type="text"
                placeholder="Ex: Desenvolvedor Full Stack"
                {...register('jobPosition', { required: 'Cargo é obrigatório' })}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              {errors.jobPosition && (
                <p className="mt-1 text-sm text-red-600">Cargo é obrigatório</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Tipo de Avaliação *
              </label>
              <select
                {...register('evaluationType', { required: 'Tipo de avaliação é obrigatório' })}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="SCORE_BASED">Baseado em Pontuação</option>
                <option value="CUSTOM">Personalizado</option>
              </select>
              {errors.evaluationType && (
                <p className="mt-1 text-sm text-red-600">Tipo de avaliação é obrigatório</p>
              )}
            </div>

            {watch('evaluationType') === 'SCORE_BASED' && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Pontuação de Corte (%)
                </label>
                <div className="w-32">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    {...register('cutoffScore', {
                      min: 0,
                      max: 100,
                      valueAsNumber: true
                    })}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                {errors.cutoffScore && (
                  <p className="mt-1 text-sm text-red-600">
                    Pontuação deve estar entre 0% e 100%
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-secondary-800">
                  Etapas do Processo
                </h2>
                <button
                  type="button"
                  onClick={addStage}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Adicionar Etapa
                </button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="bg-secondary-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-secondary-800">
                      Etapa {index + 1}
                    </h3>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStage(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remover
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Nome da Etapa *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Entrevista Técnica"
                        {...register(`stages.${index}.name` as const, { required: 'Nome da etapa é obrigatório' })}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                      {errors.stages?.[index]?.name && (
                        <p className="mt-1 text-sm text-red-600">Nome da etapa é obrigatório</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Tipo de Etapa *
                      </label>
                      <select
                        {...register(`stages.${index}.type` as const, { required: 'Tipo de etapa é obrigatório' })}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        {stageTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      {errors.stages?.[index]?.type && (
                        <p className="mt-1 text-sm text-red-600">Tipo de etapa é obrigatório</p>
                      )}
                    </div>
                  </div>

                  {watch(`stages.${index}.type`) === 'TEST' && (
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Selecionar Teste
                      </label>
                      
                      <div className="mt-2 overflow-x-auto shadow-sm rounded-lg">
                        {isLoadingTests ? (
                          <div className="flex justify-center items-center p-8 bg-white border border-secondary-200 rounded-lg">
                            <div className="text-center">
                              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-400 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                              <p className="mt-2 text-sm text-secondary-600">Carregando testes...</p>
                            </div>
                          </div>
                        ) : (
                        <table className="min-w-full divide-y divide-secondary-200 border border-secondary-200 rounded-lg">
                          <thead className="bg-secondary-50">
                            <tr>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider w-24">
                                Selecionar
                              </th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                Título
                              </th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                Descrição
                              </th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider w-24">
                                Etapas
                              </th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider w-24">
                                Questões
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-secondary-200">
                            {tests.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-4 py-4 text-center text-sm text-secondary-500">
                                  Nenhum teste disponível. <Link href="/admin/tests/new" className="text-primary-600 hover:text-primary-800">Criar um novo teste</Link>
                                </td>
                              </tr>
                            ) : (
                              tests.map((test, testIndex) => (
                                <React.Fragment key={test.id}>
                                  <tr className={watch(`stages.${index}.testId`) === test.id ? "bg-primary-50 hover:bg-primary-100" : "hover:bg-secondary-50"}>
                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                      <input
                                        type="radio"
                                        id={`test-${test.id}-${index}`}
                                        name={`stages.${index}.testId`}
                                        value={test.id}
                                        checked={watch(`stages.${index}.testId`) === test.id}
                                        onChange={() => setValue(`stages.${index}.testId`, test.id)}
                                        className="h-4 w-4 text-primary-600 border-secondary-300 focus:ring-primary-500 cursor-pointer"
                                      />
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <label htmlFor={`test-${test.id}-${index}`} className="block text-sm font-medium text-secondary-900 cursor-pointer">
                                          {test.title}
                                        </label>
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            toggleTestExpansion(test.id);
                                          }}
                                          className="ml-2 text-secondary-500 hover:text-secondary-700 focus:outline-none"
                                        >
                                          {expandedTests[test.id] ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="text-sm text-secondary-500 max-w-xs truncate">
                                        {test.description || "Sem descrição"}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-secondary-500 text-center">
                                      {test.sectionsCount}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-secondary-500 text-center">
                                      {test.questionsCount}
                                    </td>
                                  </tr>
                                  
                                  {/* Detalhes expandidos do teste */}
                                  {expandedTests[test.id] && (
                                    <tr className="bg-secondary-50">
                                      <td colSpan={5} className="px-4 py-4">
                                        <div className="rounded-md bg-white p-4 border border-secondary-200">
                                          <h4 className="text-lg font-medium text-secondary-900 mb-2">Detalhes do Teste</h4>
                                          
                                          {/* Descrição completa */}
                                          <div className="mb-4">
                                            <h5 className="text-sm font-medium text-secondary-700">Descrição:</h5>
                                            <p className="text-sm text-secondary-500">{test.description || "Sem descrição"}</p>
                                          </div>
                                          
                                          {/* Lista de etapas */}
                                          <div className="mb-4">
                                            <h5 className="text-sm font-medium text-secondary-700 mb-2">Etapas:</h5>
                                            {test.stages && test.stages.length > 0 ? (
                                              <div className="space-y-2">
                                                {test.stages.map((stage, stageIdx) => (
                                                  <div key={stage.id} className="border border-secondary-200 rounded-md p-3">
                                                    <div className="flex justify-between items-center mb-2">
                                                      <h6 className="text-sm font-medium text-secondary-800">
                                                        {stageIdx + 1}. {stage.title || "Sem título"}
                                                      </h6>
                                                    </div>
                                                    <p className="text-xs text-secondary-500 mb-2">{stage.description || "Sem descrição"}</p>
                                                    
                                                    {/* Lista de questões */}
                                                    {stage.questions && stage.questions.length > 0 ? (
                                                      <div className="pl-4 border-l-2 border-secondary-200">
                                                        <h6 className="text-xs font-medium text-secondary-700 mb-1">Questões ({stage.questions.length}):</h6>
                                                        <ul className="space-y-1">
                                                          {stage.questions.map((question, qIdx) => {
                                                            // Function to strip HTML tags
                                                            const stripHtml = (html) => {
                                                              const tmp = document.createElement("DIV");
                                                              tmp.innerHTML = html;
                                                              return tmp.textContent || tmp.innerText || "";
                                                            };
                                                            
                                                            const plainText = stripHtml(question.text);
                                                            const displayText = plainText.length > 50 ? `${plainText.substring(0, 50)}...` : plainText;
                                                            
                                                            return (
                                                              <li key={question.id} className="text-xs text-secondary-600">
                                                                {qIdx + 1}. {displayText}
                                                              </li>
                                                            );
                                                          })}
                                                        </ul>
                                                      </div>
                                                    ) : (
                                                      <p className="text-xs text-secondary-400">Sem questões</p>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <p className="text-sm text-secondary-400">Sem etapas</p>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))
                            )}
                          </tbody>
                        </table>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      {...register(`stages.${index}.description`)}
                      placeholder="Descreva os objetivos e requisitos desta etapa"
                      rows={3}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Controller
                      name={`stages.${index}.requestCandidatePhoto`}
                      control={control}
                      defaultValue={true}
                      render={({ field }) => (
                        <FormControlLabel 
                          control={
                            <Switch 
                              checked={field.value} 
                              onChange={field.onChange}
                            />
                          } 
                          label="Solicitar foto do candidato" 
                        />
                      )}
                    />

                    <Controller
                      name={`stages.${index}.showResultsToCandidate`}
                      control={control}
                      defaultValue={true}
                      render={({ field }) => (
                        <FormControlLabel 
                          control={
                            <Switch 
                              checked={field.value} 
                              onChange={field.onChange}
                            />
                          } 
                          label="Exibir resultados ao candidato" 
                        />
                      )}
                    />
                  </div>

                  {/* Configuração de pesos de traços de personalidade */}
                  {watch(`stages.${index}.type`) === 'TEST' && watch(`stages.${index}.testId`) && (
                    <div className="mt-6">
                      <h4 className="text-md font-medium text-secondary-800 mb-3">
                        Priorização de Traços de Personalidade
                      </h4>
                      <p className="text-sm text-secondary-600 mb-4">
                        Adicione e ordene os traços de personalidade que você considera mais importantes para este cargo.
                        Os traços no topo terão maior peso na avaliação do candidato.
                      </p>
                      
                      <Controller
                        name={`stages.${index}.personalityTraits`}
                        control={control}
                        defaultValue={[]}
                        render={({ field }) => (
                          <PersonalityTraitWeightConfig
                            value={field.value}
                            onChange={field.onChange}
                            testId={watch(`stages.${index}.testId`)}
                          />
                        )}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-md hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};

export default NewProcess;
