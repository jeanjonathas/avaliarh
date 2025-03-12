import { NextPage } from 'next'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'

const validationSchema = (requestPhoto: boolean = true) => Yup.object({
  name: Yup.string().required('Nome é obrigatório'),
  email: Yup.string().email('Email inválido').required('Email é obrigatório'),
  phone: Yup.string().required('Telefone é obrigatório'),
  position: Yup.string(), // Tornando o campo opcional
  instagram: Yup.string(), // Tornando o campo opcional
  photoConsent: requestPhoto 
    ? Yup.boolean().oneOf([true], 'Você precisa concordar com o uso da sua foto para identificação').required()
    : Yup.boolean(),
})

interface CandidateData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  testId?: string;
  instagram?: string;
  photoUrl?: string;
  observations?: string;
  requestPhoto?: boolean;
  showResults?: boolean;
}

interface TestData {
  id: string;
  title: string;
  description?: string;
  timeLimit?: number;
  stageCount?: number;
}

const Introducao: NextPage = () => {
  const [step, setStep] = useState<'intro' | 'form'>('intro')
  const [candidateData, setCandidateData] = useState<CandidateData | null>(null)
  const [testData, setTestData] = useState<TestData | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Verificar se há dados do candidato na sessão
    if (typeof window !== 'undefined') {
      const storedCandidateData = sessionStorage.getItem('candidateData')
      const storedTestData = sessionStorage.getItem('testData')
      
      if (storedCandidateData) {
        try {
          const parsedData = JSON.parse(storedCandidateData)
          
          // Adicionar logs para depuração
          console.log('Dados do candidato carregados:', parsedData)
          console.log('requestPhoto:', parsedData.requestPhoto)
          console.log('Tipo de requestPhoto:', typeof parsedData.requestPhoto)
          
          setCandidateData(parsedData)
          
          // Se temos uma foto, vamos atualizar o formValues também
          if (parsedData.photoUrl) {
            setFormValues(prev => ({
              ...prev,
              photoUrl: parsedData.photoUrl
            }));
          }
        } catch (error) {
          console.error('Erro ao carregar dados do candidato:', error)
        }
      }
      
      if (storedTestData) {
        try {
          const parsedData = JSON.parse(storedTestData)
          setTestData(parsedData)
        } catch (error) {
          console.error('Erro ao carregar dados do teste:', error)
        }
      }
    }
  }, [])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true)
    
    try {
      // Preparar o objeto com os dados do candidato
      const candidateInfo = {
        id: candidateData?.id || '',
        name: values.name,
        email: values.email,
        phone: values.phone,
        position: values.position || '',
        instagram: values.instagram || '',
        photoUrl: values.photoUrl || '',
        testId: testData?.id,
        fromTest: true // Indicar que a requisição vem do teste
      }
      
      console.log('Enviando dados do candidato:', candidateInfo);
      
      // Atualizar os dados do candidato na API
      const response = await fetch('/api/candidates/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(candidateInfo),
      })
      
      if (response.ok) {
        // Buscar a primeira etapa do teste associado ao candidato
        await fetchFirstStageAndRedirect(candidateInfo.id);
      } else {
        const errorData = await response.json()
        console.error('Erro na resposta da API:', errorData);
        setError(errorData.message || 'Erro ao salvar os dados. Tente novamente.')
      }
    } catch (error) {
      console.error('Erro ao enviar dados:', error)
      setError('Ocorreu um erro ao enviar os dados. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  };

  // Função para buscar a primeira etapa do teste e redirecionar
  const fetchFirstStageAndRedirect = async (candidateId: string) => {
    try {
      console.log(`Buscando a primeira etapa do teste para o candidato ${candidateId}...`);
      
      // Buscar todas as etapas do teste associado ao candidato
      const stagesResponse = await fetch(`/api/stages?candidateId=${candidateId}`);
      
      if (stagesResponse.ok) {
        const stagesData = await stagesResponse.json();
        console.log('Etapas do teste:', stagesData);
        
        if (stagesData.stages && stagesData.stages.length > 0) {
          // Pegar a primeira etapa (com menor ordem)
          const firstStage = stagesData.stages[0];
          console.log(`Primeira etapa encontrada: ${firstStage.id}, ordem: ${firstStage.order}`);
          
          // Verificar se o ID da etapa é um UUID válido
          const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firstStage.id);
          
          if (isValidUUID) {
            console.log(`ID da etapa é um UUID válido: ${firstStage.id}`);
            // Redirecionar para a primeira etapa usando o UUID
            router.push(`/teste/etapa/${firstStage.id}?candidateId=${candidateId}`);
          } else {
            console.error(`ID da etapa não é um UUID válido: ${firstStage.id}. Buscando UUID correspondente...`);
            
            // Tentar buscar o UUID correspondente ao ID não-UUID
            const uuidResponse = await fetch(`/api/stages/uuid?stageId=${firstStage.id}&candidateId=${candidateId}`);
            
            if (uuidResponse.ok) {
              const uuidData = await uuidResponse.json();
              
              if (uuidData && uuidData.uuid) {
                console.log(`UUID correspondente encontrado: ${uuidData.uuid}`);
                router.push(`/teste/etapa/${uuidData.uuid}?candidateId=${candidateId}`);
              } else {
                console.error('Nenhum UUID correspondente encontrado. Usando fallback...');
                // Fallback para o comportamento anterior
                router.push(`/teste/etapa/${firstStage.id}?candidateId=${candidateId}`);
              }
            } else {
              console.error('Erro ao buscar UUID correspondente. Usando fallback...');
              // Fallback para o comportamento anterior
              router.push(`/teste/etapa/${firstStage.id}?candidateId=${candidateId}`);
            }
          }
        } else {
          console.error('Nenhuma etapa encontrada para o teste');
          alert('Erro ao iniciar o teste: nenhuma etapa encontrada. Por favor, entre em contato com o suporte.');
        }
      } else {
        console.error('Erro ao buscar etapas do teste:', await stagesResponse.text());
        // Fallback para o comportamento anterior
        console.log('Usando fallback: redirecionando para etapa com ID 1');
        router.push(`/teste/etapa/1?candidateId=${candidateId}`);
      }
    } catch (error) {
      console.error('Erro ao buscar a primeira etapa:', error);
      // Fallback para o comportamento anterior
      console.log('Usando fallback após erro: redirecionando para etapa com ID 1');
      router.push(`/teste/etapa/1?candidateId=${candidateId}`);
    }
  };

  // Se temos os dados do candidato e estamos na etapa de formulário, vamos para a primeira etapa
  // Removendo este efeito colateral que estava causando o envio automático do formulário
  // useEffect(() => {
  //   if (candidateData && step === 'form') {
  //     handleSubmit({
  //       name: candidateData.name,
  //       email: candidateData.email,
  //       phone: candidateData.phone || '',
  //       position: candidateData.position || '',
  //     })
  //   }
  // }, [step, candidateData])

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [formValues, setFormValues] = useState({
    name: candidateData?.name || '',
    email: candidateData?.email || '',
    phone: candidateData?.phone || '',
    position: candidateData?.position || '',
    instagram: candidateData?.instagram || '',
    photoUrl: candidateData?.photoUrl || '',
    photoConsent: false,
  });

  // Atualizar os valores do formulário quando os dados do candidato mudarem
  useEffect(() => {
    if (candidateData) {
      setFormValues({
        name: candidateData.name || '',
        email: candidateData.email || '',
        phone: candidateData.phone || '',
        position: candidateData.position || '',
        instagram: candidateData.instagram || '',
        photoUrl: candidateData.photoUrl || '',
        photoConsent: false,
      });
    }
  }, [candidateData]);

  const capturePhoto = async () => {
    setShowCamera(true);
    if (navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
      } catch (error) {
        console.error('Erro ao acessar a câmera:', error)
      }
    }
  };

  const takePhoto = async (setFieldValue: any) => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const photoUrl = canvas.toDataURL('image/jpeg');
        
        // Atualizar o valor no formulário
        setFieldValue('photoUrl', photoUrl);
        
        // Atualizar também o estado local
        setFormValues(prev => ({
          ...prev,
          photoUrl
        }));
        
        // Fechar a câmera
        setShowCamera(false);
        
        // Parar a transmissão de vídeo
        if (videoRef.current.srcObject) {
          const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
          tracks.forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setFieldValue: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const photoUrl = reader.result as string;
        
        // Atualizar o valor no formulário
        setFieldValue('photoUrl', photoUrl);
        
        // Atualizar também o estado local
        setFormValues(prev => ({
          ...prev,
          photoUrl
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <header className="flex justify-between items-center mb-12">
          <Link href="/" className="text-2xl font-bold text-primary-700">
            <Image 
              src="/images/logo_horizontal.png"
              alt="AvaliaRH Logo"
              width={180}
              height={54}
              priority
            />
          </Link>
        </header>

        <main className="max-w-3xl mx-auto">
          {step === 'intro' ? (
            <div className="card">
              <h1 className="text-3xl font-bold text-secondary-900 mb-6">Sobre o Processo de Avaliação</h1>
              
              {candidateData && (
                <div className="bg-primary-50 p-4 rounded-lg mb-6 border border-primary-200">
                  <h2 className="text-xl font-semibold text-secondary-800 mb-2">Bem-vindo(a), {candidateData.name}!</h2>
                  <p className="text-secondary-700">
                    Seus dados já foram carregados. Você pode continuar para o teste assim que estiver pronto.
                  </p>
                </div>
              )}
              
              {testData && (
                <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
                  <h2 className="text-xl font-semibold text-secondary-800 mb-2">Teste: {testData.title}</h2>
                  {testData.description && (
                    <p className="text-secondary-700 mb-2">{testData.description}</p>
                  )}
                  <div className="space-y-2">
                    {testData.timeLimit && (
                      <div className="flex items-center text-blue-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span>Tempo limite: <strong className="text-primary-700">{testData.timeLimit} minutos</strong></span>
                      </div>
                    )}
                    {testData.stageCount && (
                      <div className="flex items-center text-blue-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        <span>Total de etapas: {testData.stageCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="space-y-6 text-secondary-700">
                <p>
                  Bem-vindo ao nosso sistema de avaliação de candidatos. Este teste foi desenvolvido para avaliar suas habilidades e competências de forma objetiva e transparente.
                </p>
                
                <h2 className="text-xl font-semibold text-secondary-800">Como funciona:</h2>
                <ul className="list-disc pl-6 space-y-2">
                  {testData ? (
                    <>
                      <li>O teste <strong>"{testData.title}"</strong> foi selecionado especificamente para avaliar suas habilidades.</li>
                      {testData.description && <li>{testData.description}</li>}
                      <li>O teste é composto por <strong>{testData.stageCount || 6} etapas</strong>, cada uma avaliando diferentes aspectos e habilidades.</li>
                      <li>Você deve completar cada etapa para avançar para a próxima.</li>
                      {testData.timeLimit ? (
                        <li>O teste tem um limite de tempo de <strong className="text-primary-700">{testData.timeLimit} minutos</strong>. Um contador regressivo será exibido durante o teste.</li>
                      ) : (
                        <li>Não há limite de tempo, mas recomendamos que você responda com calma e atenção.</li>
                      )}
                    </>
                  ) : (
                    <>
                      <li>O teste é composto por múltiplas etapas, cada uma com questões de múltipla escolha.</li>
                      <li>Cada etapa avalia diferentes aspectos e habilidades relevantes para a posição.</li>
                      <li>Você deve completar cada etapa para avançar para a próxima.</li>
                      <li>Não há limite de tempo, mas recomendamos que você responda com calma e atenção.</li>
                    </>
                  )}
                  <li>Após concluir todas as etapas, seus resultados serão analisados pela nossa equipe de RH.</li>
                </ul>
                
                <h2 className="text-xl font-semibold text-secondary-800">Recomendações:</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Certifique-se de estar em um ambiente tranquilo e sem distrações.</li>
                  <li>Leia cada questão com atenção antes de responder.</li>
                  <li>Responda com sinceridade - o objetivo é encontrar a melhor adequação entre suas habilidades e a posição.</li>
                  <li className="text-primary-700">Suas respostas são salvas automaticamente. Se ocorrer algum problema de conexão ou se você precisar sair, poderá continuar de onde parou mais tarde.</li>
                  <li className="text-primary-700">Utilize o botão "Salvar Progresso" para salvar suas respostas sem enviar, caso precise fazer uma pausa.</li>
                </ul>
                
                <div className="mt-8">
                  <button 
                    onClick={() => setStep('form')} 
                    className="btn-primary"
                  >
                    {candidateData ? 'Iniciar Teste' : 'Continuar para o Cadastro'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <h1 className="text-3xl font-bold text-secondary-900 mb-6">Dados do Candidato</h1>
              
              <Formik
                initialValues={formValues}
                validationSchema={validationSchema(candidateData?.requestPhoto === true)}
                onSubmit={handleSubmit}
                enableReinitialize
              >
                {({ isSubmitting, setFieldValue, values }) => (
                  <Form className="space-y-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
                        Nome Completo
                      </label>
                      <Field
                        type="text"
                        name="name"
                        id="name"
                        className="input-field"
                        placeholder="Digite seu nome completo"
                        disabled={!!candidateData}
                      />
                      <ErrorMessage name="name" component="div" className="text-red-500 text-sm mt-1" />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
                        Email
                      </label>
                      <Field
                        type="email"
                        name="email"
                        id="email"
                        className="input-field"
                        placeholder="seu.email@exemplo.com"
                        disabled={!!candidateData}
                      />
                      <ErrorMessage name="email" component="div" className="text-red-500 text-sm mt-1" />
                    </div>
                    
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-secondary-700 mb-1">
                        Telefone
                      </label>
                      <Field
                        type="text"
                        name="phone"
                        id="phone"
                        className="input-field"
                        placeholder="(00) 00000-0000"
                        disabled={!!candidateData}
                      />
                      <ErrorMessage name="phone" component="div" className="text-red-500 text-sm mt-1" />
                    </div>
                    
                    <div>
                      <label htmlFor="position" className="block text-sm font-medium text-secondary-700 mb-1">
                        Cargo Desejado
                      </label>
                      <Field
                        type="text"
                        name="position"
                        id="position"
                        className="input-field"
                        placeholder="Ex: Desenvolvedor Front-end"
                      />
                      <ErrorMessage name="position" component="div" className="text-red-500 text-sm mt-1" />
                    </div>
                    
                    <div>
                      <label htmlFor="instagram" className="block text-sm font-medium text-secondary-700 mb-1">
                        Instagram (opcional)
                      </label>
                      <Field
                        type="text"
                        name="instagram"
                        id="instagram"
                        className="input-field"
                        placeholder="@seu-usuario"
                      />
                      <ErrorMessage name="instagram" component="div" className="text-red-500 text-sm mt-1" />
                    </div>
                    
                    {/* Seção de foto - só exibir se requestPhoto for true */}
                    {(!candidateData || candidateData.requestPhoto === true) && (
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Foto para Identificação
                        </label>
                        <div className="flex flex-col items-center space-y-4">
                          <div className="relative h-48 w-48 border-2 border-dashed border-secondary-300 rounded-lg flex items-center justify-center bg-secondary-50">
                            {formValues.photoUrl ? (
                              <div className="relative h-full w-full">
                                <Image 
                                  src={formValues.photoUrl} 
                                  alt="Foto do candidato" 
                                  layout="fill" 
                                  objectFit="cover" 
                                  className="rounded-lg"
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setFieldValue('photoUrl', '');
                                    setFormValues({...formValues, photoUrl: ''});
                                  }}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <div className="text-center p-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" clipRule="evenodd" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                <p className="mt-2 text-sm text-secondary-500">Clique para adicionar uma foto</p>
                                <p className="text-xs text-secondary-400">Essa foto será usada apenas para identificação</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex space-x-3">
                            <button
                              type="button"
                              onClick={() => capturePhoto()}
                              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0111.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                </svg>
                                Tirar Selfie
                              </div>
                            </button>
                            <input
                              type="file"
                              accept="image/*"
                              id="photo-upload"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, setFieldValue)}
                              ref={fileInputRef}
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-4 py-2 bg-secondary-200 text-secondary-700 rounded-md hover:bg-secondary-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
                            >
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a3 3 0 00-3-3 3 3 0 00-3 3v4a3 3 0 013 3 3 3 0 003-3V7a1 1 0 10-2 0v4a1 1 0 11-2 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                                </svg>
                                Upload
                              </div>
                            </button>
                          </div>
                        </div>
                        
                        {/* Modal para captura de foto */}
                        {showCamera && (
                          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white p-6 rounded-lg max-w-lg w-full">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-secondary-900">Capturar Foto</h3>
                                <button
                                  type="button"
                                  onClick={() => setShowCamera(false)}
                                  className="text-secondary-400 hover:text-secondary-500"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                              <div className="relative">
                                <video
                                  ref={videoRef}
                                  autoPlay
                                  playsInline
                                  className="w-full h-auto rounded-md"
                                ></video>
                              </div>
                              <div className="mt-4 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => takePhoto(setFieldValue)}
                                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                >
                                  Capturar
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Seção de autorização para uso da foto - só exibir se requestPhoto for true */}
                    {(!candidateData || candidateData.requestPhoto === true) && (
                      <div>
                        <label htmlFor="photoConsent" className="block text-sm font-medium text-secondary-700 mb-1">
                          Autorização para uso da foto
                        </label>
                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <Field
                              type="checkbox"
                              name="photoConsent"
                              id="photoConsent"
                              className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-secondary-300 rounded"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="photoConsent" className="text-secondary-600">
                              Eu autorizo o uso da minha foto apenas para fins de identificação durante o processo seletivo. E estou ciente que minha foto apenas será usada para o fim de identificação deste processo seletivo e depois excluída.
                            </label>
                            <ErrorMessage name="photoConsent" component="div" className="text-red-500 text-sm mt-1" />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={() => setStep('intro')}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || (candidateData?.requestPhoto === true && !values.photoUrl)}
                        className={`px-4 py-2 bg-primary-600 text-white rounded-md ${
                          isSubmitting || (candidateData?.requestPhoto === true && !values.photoUrl) 
                            ? 'opacity-70 cursor-not-allowed' 
                            : 'hover:bg-primary-700'
                        }`}
                      >
                        {isSubmitting ? 'Enviando...' : 'Iniciar Teste'}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default Introducao
