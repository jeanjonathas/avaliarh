import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  RadialLinearScale,
  Filler
} from 'chart.js'
import { Bar, Radar } from 'react-chartjs-2'
import { Rating } from '@mui/material'
import Navbar from '../admin/Navbar'
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNotification } from '../../contexts/NotificationContext';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler
)

interface Response {
  id: string
  questionId: string
  optionId: string
  questionText: string
  optionText: string
  isCorrectOption: boolean
  stageName?: string
  stageId?: string
  categoryName?: string
  questionSnapshot?: string | any
  allOptionsSnapshot?: string | any
  question?: {
    Stage?: {
      id: string
      title: string
    }
    Category?: {
      id: string
      name: string
    }
  }
  option?: {
    id: string
    text: string
    isCorrect: boolean
  }
}

interface Candidate {
  id: string
  name: string
  email: string
  phone?: string
  position?: string
  testDate: string
  interviewDate?: string
  completed: boolean
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rating?: number
  observations?: string
  infoJobsLink?: string
  socialMediaUrl?: string
  resumeFile?: string
  linkedin?: string
  github?: string
  portfolio?: string
  resumeUrl?: string
  inviteCode?: string
  inviteExpires?: string
  inviteSent?: boolean
  inviteAttempts?: number
  testId?: string
  test?: {
    id: string
    title: string
    description?: string
    TestStage?: {
      stageId: string
      stage: {
        id: string
        title: string
      }
    }[]
  }
  score?: number | {
    correct: number;
    total: number;
    percentage: number;
  }
  timeSpent?: number
  createdAt: string
  updatedAt: string
  responses?: Response[]
  stageScores?: {
    id: string
    name: string
    correct: number
    total: number
    percentage: number
    order?: number
  }[]
  photoUrl?: string
}

const CandidateDetails = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { id } = router.query
  const { showToast } = useNotification();
  
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'performance' | 'profile' | 'responses'>('performance')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    position: '',
    status: 'PENDING',
    observations: '',
    rating: '0',
    inviteCode: '',
    inviteExpires: null,
    inviteSent: false,
    inviteAttempts: 0,
    testId: ''
  })
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isNewCodeGenerated, setIsNewCodeGenerated] = useState(false);
  const [availableTests, setAvailableTests] = useState([]);
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Função para formatar o tempo em horas, minutos e segundos
  const formatTime = (seconds) => {
    if (!seconds) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    let formattedTime = '';
    
    if (hours > 0) {
      formattedTime += `${hours}h `;
    }
    
    if (minutes > 0 || hours > 0) {
      formattedTime += `${minutes}m `;
    }
    
    formattedTime += `${remainingSeconds}s`;
    
    return formattedTime;
  };

  // Verificar autenticação
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])
  
  // Buscar dados do candidato e lista de candidatos para navegação
  useEffect(() => {
    if (id && status === 'authenticated') {
      fetchCandidate()
      fetchCandidates()
      fetchTests()
    }
  }, [id, status])
  
  // Atualizar o índice atual quando a lista de candidatos for carregada
  useEffect(() => {
    if (candidates.length > 0 && id) {
      const index = candidates.findIndex(c => c.id === id)
      setCurrentIndex(index)
    }
  }, [candidates, id])
  
  // Buscar dados do candidato específico
  const fetchCandidate = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/candidates/${id}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar dados do candidato');
      }
      
      const data = await response.json();
      console.log('Dados recebidos da API:', data);
      
      // Extrair o objeto candidate da resposta
      const candidateData = data.candidate;
      
      if (!candidateData) {
        throw new Error('Dados do candidato não encontrados na resposta');
      }
      
      console.log('Dados do candidato:', candidateData);
      console.log('Respostas recebidas:', candidateData.responses ? candidateData.responses.length : 0);
      
      // Garantir que as respostas sejam um array
      if (candidateData.responses && !Array.isArray(candidateData.responses)) {
        console.error('Respostas não é um array:', candidateData.responses);
        candidateData.responses = [];
      }
      
      setCandidate(candidateData);
      
      setFormData({
        name: candidateData.name || '',
        email: candidateData.email || '',
        position: candidateData.position || '',
        status: candidateData.status || 'PENDING',
        observations: candidateData.observations || '',
        rating: candidateData.rating ? candidateData.rating.toString() : '0',
        inviteCode: candidateData.inviteCode || '',
        inviteExpires: candidateData.inviteExpires || null,
        inviteSent: candidateData.inviteSent || false,
        inviteAttempts: candidateData.inviteAttempts || 0,
        testId: candidateData.testId || ''
      });
      
      if (candidateData.testId) {
        setSelectedTest(candidateData.testId);
      }
      
      setError(null);
    } catch (error) {
      console.error('Erro ao buscar candidato:', error);
      setError('Erro ao carregar dados do candidato. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Buscar lista de todos os candidatos para navegação
  const fetchCandidates = async () => {
    try {
      const response = await fetch('/api/admin/candidates')
      
      if (!response.ok) {
        throw new Error('Falha ao carregar lista de candidatos')
      }
      
      const data = await response.json()
      setCandidates(data)
    } catch (err) {
      console.error(err)
    }
  }
  
  // Buscar testes disponíveis
  const fetchTests = async () => {
    try {
      setIsLoadingTests(true);
      const response = await fetch('/api/admin/tests');
      
      if (!response.ok) {
        throw new Error('Erro ao buscar testes');
      }
      
      const data = await response.json();
      setAvailableTests(data.tests || []);
    } catch (error) {
      console.error('Erro ao buscar testes:', error);
    } finally {
      setIsLoadingTests(false);
    }
  };

  // Navegar para o próximo candidato
  const goToNextCandidate = () => {
    if (currentIndex < candidates.length - 1) {
      const nextCandidate = candidates[currentIndex + 1]
      router.push(`/admin/candidate/${nextCandidate.id}`)
    }
  }
  
  // Navegar para o candidato anterior
  const goToPreviousCandidate = () => {
    if (currentIndex > 0) {
      const prevCandidate = candidates[currentIndex - 1]
      router.push(`/admin/candidate/${prevCandidate.id}`)
    }
  }
  
  // Manipular mudanças no formulário
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  
  // Salvar alterações no candidato
  const handleSave = async () => {
    try {
      const response = await fetch(`/api/admin/candidates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...candidate,
          name: formData.name,
          email: formData.email,
          position: formData.position,
          status: formData.status,
          observations: formData.observations,
          rating: parseFloat(formData.rating),
        }),
      })
      
      if (!response.ok) {
        throw new Error('Falha ao atualizar candidato')
      }
      
      // Recarregar dados do candidato
      fetchCandidate()
      showToast('Candidato atualizado com sucesso!', 'success');
    } catch (err) {
      console.error(err)
      showToast('Erro ao atualizar candidato', 'error');
    }
  }

  const generateNewInvite = async () => {
    try {
      setIsGeneratingInvite(true);
      console.log('Gerando novo convite para candidato:', candidate?.id);
      
      if (!candidate || !candidate.id) {
        console.error('Erro: candidato não definido ou sem ID');
        showToast('Erro: dados do candidato não disponíveis. Recarregue a página e tente novamente.', 'error');
        setIsGeneratingInvite(false);
        return;
      }
      
      if (!formData.testId) {
        showToast('Por favor, selecione um teste para o candidato antes de gerar o convite.', 'warning');
        setIsGeneratingInvite(false);
        return;
      }
      
      const response = await fetch(`/api/admin/candidates/generate-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          candidateId: candidate.id,
          forceNew: true, // Forçar a geração de um novo código
          testId: formData.testId // Incluir o ID do teste selecionado
        }),
      });

      console.log('Resposta do servidor:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta:', errorText);
        throw new Error(`Erro ao gerar novo convite: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Dados recebidos:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido ao gerar convite');
      }
      
      // Atualizar o candidato com os novos dados
      const updatedCandidate = {
        ...candidate,
        inviteCode: data.inviteCode,
        inviteExpires: data.inviteExpires,
        inviteSent: data.emailSent || false,
        inviteAttempts: 0,
        testId: formData.testId
      };
      
      setCandidate(updatedCandidate);

      // Atualizar o formulário também
      setFormData(prev => ({
        ...prev,
        inviteCode: data.inviteCode,
        inviteExpires: data.inviteExpires,
        inviteSent: data.emailSent || false,
        inviteAttempts: 0
      }));

      // Atualiza a lista de candidatos
      setCandidates(prev => 
        prev.map(c => c.id === candidate.id ? {
          ...c,
          inviteCode: data.inviteCode,
          inviteExpires: data.inviteExpires,
          inviteSent: data.emailSent || false,
          inviteAttempts: 0,
          testId: formData.testId
        } : c)
      );
      
      // Abrir o modal de compartilhamento em vez de mostrar um alert
      setIsShareModalOpen(true);
      setIsNewCodeGenerated(true);
      showToast('Código de convite gerado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao gerar convite:', error);
      showToast('Erro ao gerar novo convite. Por favor, tente novamente.', 'error');
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleShare = () => {
    if (candidate?.inviteCode) {
      setIsShareModalOpen(true);
    } else {
      showToast('Não há código de convite para compartilhar. Gere um código primeiro.', 'warning');
    }
  };

  const shareByEmail = async () => {
    try {
      if (!candidate || !candidate.id) {
        console.error('Erro: candidato não definido ou sem ID');
        showToast('Erro: dados do candidato não disponíveis. Recarregue a página e tente novamente.', 'error');
        return;
      }
      
      console.log('Enviando convite por email para candidato:', candidate.id);
      const response = await fetch('/api/admin/candidates/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ candidateId: candidate.id }),
      });

      console.log('Resposta do servidor:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta:', errorText);
        throw new Error(`Erro ao enviar convite por email: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Atualiza o candidato com o status de envio
      setCandidate(prev => {
        if (!prev) return null;
        return {
          ...prev,
          inviteSent: true
        };
      });
      
      showToast('Convite enviado com sucesso para o email do candidato!', 'success');
      setIsShareModalOpen(false);
    } catch (error) {
      console.error('Erro ao enviar convite:', error);
      showToast('Erro ao enviar convite por email. Por favor, tente novamente.', 'error');
    }
  };

  const shareByWhatsApp = () => {
    try {
      if (!candidate?.inviteCode) {
        showToast('Não há código de convite para compartilhar. Gere um código primeiro.', 'warning');
        return;
      }
      
      console.log('Compartilhando convite via WhatsApp para candidato:', candidate.name);
      
      // Criar mensagem para o WhatsApp
      const message = `Olá ${candidate.name}, aqui está seu código de convite para o processo seletivo: ${candidate.inviteCode}. Acesse o sistema Admitto para realizar sua avaliação.`;
      
      // Codificar a mensagem para URL
      const encodedMessage = encodeURIComponent(message);
      
      // Abrir WhatsApp Web com a mensagem pré-preenchida
      window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    } catch (error) {
      console.error('Erro ao compartilhar via WhatsApp:', error);
      showToast('Erro ao compartilhar via WhatsApp. Por favor, tente novamente.', 'error');
    }
  };

  // Função para excluir o candidato
  const handleDeleteCandidate = async () => {
    try {
      if (!candidate || !candidate.id) {
        showToast('Erro: dados do candidato não disponíveis.', 'error');
        return;
      }

      const response = await fetch(`/api/admin/candidates/${candidate.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir candidato');
      }

      showToast('Candidato excluído com sucesso!', 'success');
      setShowDeleteModal(false);
      
      // Redirecionar para a página de candidatos
      router.push('/admin/candidates');
    } catch (error) {
      console.error('Erro ao excluir candidato:', error);
      showToast('Erro ao excluir candidato. Por favor, tente novamente.', 'error');
    }
  };

  // Dados para o gráfico de radar - usando dinamicamente os nomes das etapas
  const [radarData, setRadarData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Desempenho do Candidato',
        data: [],
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true
      }
    ],
  })

  // Opções para o gráfico de radar
  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
        },
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: {
          stepSize: 20,
          backdropColor: 'transparent',
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.raw}%`;
          }
        }
      }
    },
  }

  // Dados para o gráfico de barras - usando dinamicamente os nomes das etapas
  const [barData, setBarData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Acertos',
        data: [],
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.7,
      },
      {
        label: 'Total',
        data: [],
        backgroundColor: 'rgba(200, 200, 200, 0.7)',
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.7,
      }
    ]
  })

  // Opções para o gráfico de barras - com escala Y dinâmica
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        // Definir o máximo com base no maior número de questões nas etapas
        max: candidate?.stageScores ? 
        Math.max(...candidate.stageScores.map(score => score.total)) : 5,
        ticks: {
          stepSize: 1,
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.raw}`;
          }
        }
      }
    },
  }

  // Efeito para processar os dados do candidato quando eles são carregados
  useEffect(() => {
    if (candidate && candidate.id) {
      console.log('Dados do candidato carregados:', candidate);
      
      // Processar as respostas para agrupar por etapa
      if (candidate.responses && candidate.responses.length > 0) {
        console.log('Processando respostas:', candidate.responses.length);
        
        // Obter os IDs das etapas do teste atual do candidato
        const testStageIds = candidate.test?.TestStage?.map(ts => ts.stageId) || [];
        
        // Filtrar apenas as respostas que pertencem às etapas do teste atual
        const filteredResponses = candidate.test 
          ? candidate.responses.filter(response => 
              response.stageId && testStageIds.includes(response.stageId)
            )
          : candidate.responses;
        
        // Ordenar as respostas por ID de etapa para garantir que apareçam na ordem correta
        const sortedResponses = [...filteredResponses].sort((a, b) => {
          const stageA = a.question?.Stage?.id || '';
          const stageB = b.question?.Stage?.id || '';
          return stageA.localeCompare(stageB);
        });
        
        // Agrupar respostas por etapa
        const stageResponses: Record<string, Response[]> = {};
        
        sortedResponses.forEach(response => {
          let stageName = 'Etapa não identificada';
          
          // Tentar obter o nome da etapa de várias fontes
          if (response.stageName) {
            stageName = response.stageName;
          } else if (response.question && response.question.Stage && response.question.Stage.title) {
            stageName = response.question.Stage.title;
          } else if (response.questionSnapshot) {
            try {
              const snapshot = typeof response.questionSnapshot === 'string' 
                ? JSON.parse(response.questionSnapshot)
                : response.questionSnapshot;
              
              if (snapshot.stageName) {
                stageName = snapshot.stageName;
              }
            } catch (e) {
              console.error('Erro ao parsear questionSnapshot:', e);
            }
          }
          
          if (!stageResponses[stageName]) {
            stageResponses[stageName] = [];
          }
          stageResponses[stageName].push(response);
        });
        
        console.log('Respostas agrupadas por etapa:', Object.keys(stageResponses));
      }
      
      // Processar os dados de desempenho para os gráficos
      if (candidate.stageScores && candidate.stageScores.length > 0) {
        console.log('Processando dados de desempenho:', candidate.stageScores);
        
        // Usar a ordem que vem do backend, que já está ordenada corretamente
        const sortedStages = [...candidate.stageScores];
        
        // Atualizar os dados dos gráficos
        setRadarData({
          labels: sortedStages.map(score => score.name),
          datasets: [
            {
              label: 'Desempenho do Candidato',
              data: sortedStages.map(score => score.percentage),
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 2,
              pointBackgroundColor: 'rgba(54, 162, 235, 1)',
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
              pointRadius: 4,
              pointHoverRadius: 6,
              fill: true
            }
          ],
        });
        
        setBarData({
          labels: sortedStages.map(score => score.name),
          datasets: [
            {
              label: 'Acertos',
              data: sortedStages.map(score => score.correct),
              backgroundColor: 'rgba(75, 192, 192, 0.7)',
              borderRadius: 4,
              barPercentage: 0.6,
              categoryPercentage: 0.7,
            },
            {
              label: 'Total',
              data: sortedStages.map(score => score.total),
              backgroundColor: 'rgba(200, 200, 200, 0.7)',
              borderRadius: 4,
              barPercentage: 0.6,
              categoryPercentage: 0.7,
            }
          ]
        });
      }
    }
  }, [candidate]);

  // Ordenar as etapas para exibição na tabela de desempenho detalhado e nas respostas
  useEffect(() => {
    if (candidate && candidate.test && candidate.test.TestStage) {
      // Criar um mapa de ordem das etapas
      const stageOrderMap = {};
      candidate.test.TestStage.forEach((testStage, index) => {
        stageOrderMap[testStage.stageId] = index;
      });
      
      // Ordenar as etapas na tabela de desempenho detalhado
      if (candidate.stageScores) {
        const orderedStageScores = [...candidate.stageScores].sort((a, b) => {
          const orderA = stageOrderMap[a.id] !== undefined ? stageOrderMap[a.id] : 999;
          const orderB = stageOrderMap[b.id] !== undefined ? stageOrderMap[b.id] : 999;
          return orderA - orderB;
        });
        
        // Atualizar os dados do candidato com as etapas ordenadas
        setCandidate(prev => ({
          ...prev,
          stageScores: orderedStageScores
        }));
      }
      
      // Ordenar as respostas por etapa
      if (candidate.responses) {
        // Agrupar respostas por etapa
        const responsesByStage = {};
        candidate.responses.forEach(response => {
          if (response.stageId) {
            if (!responsesByStage[response.stageId]) {
              responsesByStage[response.stageId] = [];
            }
            responsesByStage[response.stageId].push(response);
          }
        });
        
        // Ordenar as etapas e depois concatenar todas as respostas
        const orderedResponses = Object.keys(responsesByStage)
          .sort((a, b) => {
            const orderA = stageOrderMap[a] !== undefined ? stageOrderMap[a] : 999;
            const orderB = stageOrderMap[b] !== undefined ? stageOrderMap[b] : 999;
            return orderA - orderB;
          })
          .flatMap(stageId => responsesByStage[stageId]);
        
        // Atualizar os dados do candidato com as respostas ordenadas
        setCandidate(prev => ({
          ...prev,
          responses: orderedResponses
        }));
      }
    }
  }, [candidate?.test]);

  useEffect(() => {
    if (candidate && candidate.stageScores) {
      // Ordenar as etapas conforme a ordem definida no teste
      const orderedStageScores = [...candidate.stageScores].sort((a, b) => {
        // Se tiver campo order, usar ele
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        // Caso contrário, ordenar pelo nome
        return a.name.localeCompare(b.name);
      });

      // Calcular pontuação total com precisão de uma casa decimal
      const totalCorrect = orderedStageScores.reduce((acc, stage) => acc + stage.correct, 0);
      const totalQuestions = orderedStageScores.reduce((acc, stage) => acc + stage.total, 0);
      
      // Garantir que estamos usando o número correto de casas decimais
      const percentage = totalQuestions > 0 
        ? parseFloat((totalCorrect * 100 / totalQuestions).toFixed(1)) 
        : 0;
      
      // Atualizar o score como um objeto
      const scoreObject = {
        correct: totalCorrect,
        total: totalQuestions,
        percentage
      };
      
      setCandidate(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          score: scoreObject
        };
      });
      
      console.log(`Pontuação total calculada: ${totalCorrect}/${totalQuestions} (${percentage}%)`);
    }
  }, [candidate?.stageScores]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-700">Carregando...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-secondary-50 flex justify-center items-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-secondary-800 mb-2">Erro</h2>
          <p className="text-secondary-700">{error}</p>
          <button 
            onClick={() => router.push('/admin/dashboard')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-secondary-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/admin/candidates" className="text-primary-600 hover:text-primary-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Voltar
            </Link>
            <h1 className="text-2xl font-bold text-secondary-800">Detalhes do Candidato</h1>
          </div>
          
          <div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Excluir Candidato
            </button>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={goToPreviousCandidate}
              disabled={currentIndex <= 0}
              className={`p-2 rounded-md ${currentIndex <= 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'}`}
              title="Candidato anterior"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="px-3 py-2 bg-white rounded-md shadow-sm text-sm text-secondary-700">
              {currentIndex + 1} de {candidates.length}
            </span>
            <button
              onClick={goToNextCandidate}
              disabled={currentIndex >= candidates.length - 1}
              className={`p-2 rounded-md ${currentIndex >= candidates.length - 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'}`}
              title="Próximo candidato"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10 10.586 7.707 6.293a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        {candidate && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  className={`px-6 py-4 font-medium text-sm focus:outline-none transition-colors duration-200 ${
                    activeTab === 'performance'
                      ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50'
                      : 'text-secondary-600 hover:text-primary-500 hover:bg-secondary-50'
                  }`}
                  onClick={() => setActiveTab('performance')}
                >
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-primary-100 text-primary-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-secondary-500">Pontuação Geral</h4>
                      <div className="flex items-baseline">
                        <span className="text-2xl font-semibold text-secondary-900">
                          {typeof candidate.score === 'object' 
                            ? candidate.score.percentage 
                            : parseFloat((candidate.score || 0).toFixed(1))}%</span>
                        <span className="ml-2 text-sm text-secondary-500">
                          ({typeof candidate.score === 'object' 
                            ? `${candidate.score.correct}/${candidate.score.total}` 
                            : '0/0'})
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  className={`px-6 py-4 font-medium text-sm focus:outline-none transition-colors duration-200 ${
                    activeTab === 'responses'
                      ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50'
                      : 'text-secondary-600 hover:text-primary-500 hover:bg-secondary-50'
                  }`}
                  onClick={() => setActiveTab('responses')}
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-1.707-.707L12 7 8.707 4.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L11 6H7a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1H7a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2z" />
                    </svg>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-secondary-500">Respostas</h4>
                    </div>
                  </div>
                </button>
                <button
                  className={`px-6 py-4 font-medium text-sm focus:outline-none transition-colors duration-200 ${
                    activeTab === 'profile'
                      ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50'
                      : 'text-secondary-600 hover:text-primary-500 hover:bg-secondary-50'
                  }`}
                  onClick={() => setActiveTab('profile')}
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </svg>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-secondary-500">Informações Pessoais</h4>
                    </div>
                  </div>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {activeTab === 'responses' ? (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-secondary-800 mb-4">Respostas do Candidato</h3>
                    
                    {!candidate.completed ? (
                      <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                        <h4 className="font-medium text-blue-800">Aguardando Respostas</h4>
                        <p className="mt-2 text-blue-700">
                          Este candidato ainda não realizou o teste. As respostas serão exibidas após a conclusão da avaliação.
                        </p>
                      </div>
                    ) : (
                      <div>
                        {/* Adicionar logs para depuração */}
                        <div style={{ display: 'none' }} id="debug-info" data-has-responses={candidate.responses && candidate.responses.length > 0 ? 'true' : 'false'}></div>
                        {typeof window !== 'undefined' && (
                          <>
                            {console.log('Dados do candidato na renderização:', candidate)}
                            {console.log('Respostas disponíveis na renderização:', candidate.responses ? candidate.responses.length : 0)}
                            {console.log('Tipo de candidate.responses:', candidate.responses ? typeof candidate.responses : 'undefined')}
                            {console.log('É um array?', candidate.responses ? Array.isArray(candidate.responses) : 'N/A')}
                            {candidate.responses && candidate.responses.length > 0 && console.log('Primeira resposta:', candidate.responses[0])}
                          </>
                        )}
                        {candidate.responses && Array.isArray(candidate.responses) && candidate.responses.length > 0 ? (
                          <div className="space-y-6">
                            {/* Agrupar respostas por etapa */}
                            {(() => {
                              // Obter os IDs das etapas do teste atual do candidato
                              const testStageIds = candidate.test?.TestStage?.map(ts => ts.stageId) || [];
                              
                              // Filtrar apenas as respostas que pertencem às etapas do teste atual
                              const filteredResponses = candidate.test 
                                ? candidate.responses.filter(response => 
                                    response.stageId && testStageIds.includes(response.stageId)
                                  )
                                : candidate.responses;
                              
                              // Ordenar as respostas por ID de etapa para garantir que apareçam na ordem correta
                              const sortedResponses = [...filteredResponses].sort((a, b) => {
                                const stageA = a.question?.Stage?.id || '';
                                const stageB = b.question?.Stage?.id || '';
                                return stageA.localeCompare(stageB);
                              });
                              
                              // Agrupar respostas por etapa
                              const stageResponses: Record<string, Response[]> = {};
                              
                              sortedResponses.forEach(response => {
                                let stageName = 'Etapa não identificada';
                                
                                // Tentar obter o nome da etapa de várias fontes
                                if (response.stageName) {
                                  stageName = response.stageName;
                                } else if (response.question && response.question.Stage && response.question.Stage.title) {
                                  stageName = response.question.Stage.title;
                                } else if (response.questionSnapshot) {
                                  try {
                                    const snapshot = typeof response.questionSnapshot === 'string' 
                                      ? JSON.parse(response.questionSnapshot)
                                      : response.questionSnapshot;
                                    
                                    if (snapshot.stageName) {
                                      stageName = snapshot.stageName;
                                    }
                                  } catch (e) {
                                    console.error('Erro ao parsear questionSnapshot:', e);
                                  }
                                }
                                
                                if (!stageResponses[stageName]) {
                                  stageResponses[stageName] = [];
                                }
                                stageResponses[stageName].push(response);
                              });
                              
                              console.log('Respostas agrupadas por etapa:', Object.keys(stageResponses));
                              
                              return Object.entries(stageResponses).map(([stageName, responses]: [string, any[]]) => (
                                <div key={stageName} className="border border-secondary-200 rounded-lg overflow-hidden mb-6">
                                  <div className="bg-secondary-50 px-4 py-3 border-b border-secondary-200">
                                    <h4 className="font-medium text-secondary-800">{stageName}</h4>
                                  </div>
                                  <div className="divide-y divide-secondary-200">
                                    {responses.map((response, index) => {
                                      // Acessar o snapshot da questão e opções
                                      let questionSnapshot: {id?: string; text?: string; categoryId?: string; categoryName?: string} = {};
                                      let allOptionsSnapshot: {id: string; text: string; isCorrect: boolean}[] = [];
                                      let questionText = '';
                                      let selectedOptionText = '';
                                      let isCorrect = false;
                                      
                                      try {
                                        // Tentar obter o texto da questão de várias fontes
                                        if (response.questionText) {
                                          questionText = response.questionText;
                                        } else if (response.question && response.question.text) {
                                          questionText = response.question.text;
                                        }
                                        
                                        // Tentar obter o texto da opção selecionada
                                        if (response.optionText) {
                                          selectedOptionText = response.optionText;
                                        } else if (response.option && response.option.text) {
                                          selectedOptionText = response.option.text;
                                        }
                                        
                                        // Verificar se a resposta está correta
                                        if (response.isCorrectOption !== undefined) {
                                          isCorrect = response.isCorrectOption;
                                        } else if (response.option && response.option.isCorrect !== undefined) {
                                          isCorrect = response.option.isCorrect;
                                        }
                                        
                                        // Processar o snapshot da questão
                                        if (response.questionSnapshot) {
                                          // Verificar se já é um objeto ou se precisa ser parseado
                                          if (typeof response.questionSnapshot === 'string') {
                                            try {
                                              questionSnapshot = JSON.parse(response.questionSnapshot);
                                            } catch (e) {
                                              console.error('Erro ao parsear questionSnapshot como string:', e);
                                              questionSnapshot = response.questionSnapshot;
                                            }
                                          } else {
                                            questionSnapshot = response.questionSnapshot;
                                          }
                                          
                                          // Se ainda não temos o texto da questão, usar o do snapshot
                                          if (!questionText && questionSnapshot && questionSnapshot.text) {
                                            questionText = questionSnapshot.text;
                                          }
                                        }
                                        
                                        // Processar o snapshot das opções
                                        if (response.allOptionsSnapshot) {
                                          // Verificar se já é um array ou se precisa ser parseado
                                          if (typeof response.allOptionsSnapshot === 'string') {
                                            try {
                                              allOptionsSnapshot = JSON.parse(response.allOptionsSnapshot);
                                            } catch (e) {
                                              console.error('Erro ao parsear allOptionsSnapshot como string:', e);
                                              allOptionsSnapshot = [];
                                            }
                                          } else if (Array.isArray(response.allOptionsSnapshot)) {
                                            allOptionsSnapshot = response.allOptionsSnapshot;
                                          }
                                          
                                          // Se ainda não temos o texto da opção selecionada, procurar no snapshot
                                          if (!selectedOptionText && allOptionsSnapshot && allOptionsSnapshot.length > 0) {
                                            const selectedOption = allOptionsSnapshot.find(opt => opt.id === response.optionId);
                                            if (selectedOption) {
                                              selectedOptionText = selectedOption.text;
                                              if (isCorrect === false && selectedOption.isCorrect !== undefined) {
                                                isCorrect = selectedOption.isCorrect;
                                              }
                                            }
                                          }
                                        }
                                        
                                        // Se não temos opções do snapshot, tentar obter da relação question.options
                                        if ((!allOptionsSnapshot || allOptionsSnapshot.length === 0) && response.question && response.question.options && response.question.options.length > 0) {
                                          allOptionsSnapshot = response.question.options.map(opt => ({
                                            id: opt.id,
                                            text: opt.text,
                                            isCorrect: opt.isCorrect
                                          }));
                                          
                                          // Se ainda não temos o texto da opção selecionada, procurar nas opções da questão
                                          if (!selectedOptionText) {
                                            const selectedOption = response.question.options.find(opt => opt.id === response.optionId);
                                            if (selectedOption) {
                                              selectedOptionText = selectedOption.text;
                                              if (isCorrect === false && selectedOption.isCorrect !== undefined) {
                                                isCorrect = selectedOption.isCorrect;
                                              }
                                            }
                                          }
                                        }
                                      } catch (error) {
                                        console.error('Erro ao processar resposta:', error);
                                      }
                                      
                                      return (
                                        <div key={response.id} className="p-4">
                                          <div className="mb-3">
                                            <p className="font-medium text-secondary-700">
                                              {index + 1}. {questionText || (questionSnapshot && questionSnapshot.text) || 'Pergunta não disponível'}
                                            </p>
                                            {(questionSnapshot && questionSnapshot.categoryName || response.categoryName) && (
                                              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-secondary-100 text-secondary-600 rounded">
                                                {(questionSnapshot && questionSnapshot.categoryName) || response.categoryName}
                                              </span>
                                            )}
                                          </div>
                                          
                                          <div className="ml-4 space-y-2">
                                            {allOptionsSnapshot.length > 0 ? (
                                              allOptionsSnapshot.map(option => {
                                                // Verificar se esta opção foi a selecionada pelo candidato
                                                const isSelected = option.id === response.optionId;
                                                
                                                // Verificar se esta opção é a correta segundo o snapshot
                                                const optionIsCorrect = option.isCorrect === true;
                                                
                                                // Determinar se a resposta do candidato está correta
                                                // Usamos a informação de isCorrectOption da resposta, que já foi corrigida na API
                                                let responseIsCorrect = response.isCorrectOption === true;
                                                
                                                // Verificar se há inconsistência (resposta correta marcada como incorreta)
                                                if (!responseIsCorrect && isSelected && optionIsCorrect) {
                                                  // Se a opção selecionada é a correta, mas isCorrectOption é falso,
                                                  // isso indica um problema de inconsistência
                                                  responseIsCorrect = true;
                                                }
                                                
                                                // Lógica para determinar se esta opção deve ser destacada como selecionada
                                                const shouldHighlightAsSelected = isSelected;
                                                
                                                // Determinar se a opção selecionada deve ser marcada como correta
                                                // Se a opção selecionada é a correta, ou se a resposta foi marcada como correta na API,
                                                // consideramos que a opção selecionada está correta
                                                const shouldMarkAsCorrect = isSelected && (responseIsCorrect || optionIsCorrect);
                                                
                                                return (
                                                  <div 
                                                    key={option.id} 
                                                    className={`flex items-start p-2 rounded ${
                                                      shouldHighlightAsSelected 
                                                        ? (shouldMarkAsCorrect ? 'bg-green-50' : 'bg-red-50') 
                                                        : (optionIsCorrect ? 'bg-green-50/30 border border-green-100' : '')
                                                    }`}
                                                  >
                                                    <div className="flex-shrink-0 mt-0.5">
                                                      {shouldHighlightAsSelected ? (
                                                        <svg className={`h-5 w-5 ${shouldMarkAsCorrect ? 'text-green-500' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                      ) : (
                                                        <svg className={`h-5 w-5 ${optionIsCorrect ? 'text-green-300' : 'text-secondary-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                      )}
                                                    </div>
                                                    <div className="ml-2">
                                                      <p className={`text-sm ${
                                                        shouldHighlightAsSelected 
                                                          ? (shouldMarkAsCorrect ? 'text-green-700 font-medium' : 'text-red-700 font-medium') 
                                                          : (optionIsCorrect ? 'text-green-600/80 font-medium' : 'text-secondary-600')
                                                      }`}>
                                                        {option.text}
                                                      </p>
                                                      {shouldHighlightAsSelected && (
                                                        <p className="text-xs mt-1">
                                                          {shouldMarkAsCorrect ? (
                                                            <span className="text-green-600">Escolhida (Correta)</span>
                                                          ) : (
                                                            <span className="text-red-600">Escolhida (Incorreta)</span>
                                                          )}
                                                        </p>
                                                      )}
                                                      {!shouldHighlightAsSelected && optionIsCorrect && (
                                                        <p className="text-xs mt-1 text-green-600/80">Alternativa correta</p>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })
                                            ) : (
                                              <div className="p-2">
                                                <p className="text-sm text-secondary-600">
                                                  <strong>Resposta escolhida:</strong> {selectedOptionText || response.optionText || (response.option && response.option.text) || 'Não disponível'}
                                                </p>
                                                <p className="text-xs mt-1">
                                                  {isCorrect ? (
                                                    <span className="text-green-600">Resposta correta</span>
                                                  ) : (
                                                    <span className="text-red-600">Resposta incorreta</span>
                                                  )}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        ) : (
                          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                            <p className="text-yellow-700">
                              Não foram encontradas respostas para este candidato.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === 'performance' ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Cards de resumo de desempenho */}
                    <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-primary-500">
                      <div className="flex items-center">
                        <div className="p-3 rounded-full bg-primary-100 text-primary-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-sm font-medium text-secondary-500">Pontuação Geral</h4>
                          <div className="flex items-baseline">
                            <span className="text-2xl font-semibold text-secondary-900">
                              {typeof candidate.score === 'object' 
                                ? candidate.score.percentage 
                                : parseFloat((candidate.score || 0).toFixed(1))}%</span>
                            <span className="ml-2 text-sm text-secondary-500">
                              ({typeof candidate.score === 'object' 
                                ? `${candidate.score.correct}/${candidate.score.total}` 
                                : '0/0'})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-blue-500">
                      <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-sm font-medium text-secondary-500">Status do Teste</h4>
                          <div className="flex items-baseline">
                            <span className="text-2xl font-semibold text-secondary-900">
                              {!candidate.completed ? 'Pendente' : (() => {
                                const totalCorrect = candidate.stageScores?.reduce((acc, stage) => acc + stage.correct, 0) || 0;
                                const totalQuestions = candidate.stageScores?.reduce((acc, stage) => acc + stage.total, 0) || 0;
                                const percentage = totalQuestions > 0 ? parseFloat((totalCorrect / totalQuestions * 100).toFixed(1)) : 0;
                                
                                if (percentage >= 80) return 'Aprovado';
                                if (percentage >= 60) return 'Consideração';
                                return 'Reprovado';
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-amber-500">
                      <div className="flex items-center">
                        <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-sm font-medium text-secondary-500">Tempo Gasto</h4>
                          <div className="flex items-baseline">
                            <span className="text-2xl font-semibold text-secondary-900">
                              {formatTime(candidate.timeSpent)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Gráfico de Radar - Desempenho por Habilidade */}
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-secondary-800 mb-4">Desempenho por Habilidade</h3>
                    {candidate.stageScores && candidate.stageScores.length > 0 ? (
                      <div className="h-80">
                        <Radar data={radarData} options={radarOptions} />
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                        <p className="text-yellow-700">
                          Não há dados de desempenho disponíveis para este candidato.
                        </p>
                      </div>
                    )}
                    <div className="mt-4 text-sm text-gray-500">
                      <p>Este gráfico mostra o desempenho percentual do candidato em cada etapa de avaliação.</p>
                    </div>
                  </div>
                  
                  {/* Gráfico de Barras - Desempenho por Etapa */}
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-secondary-800 mb-4">Desempenho por Etapa</h3>
                    {candidate.stageScores && candidate.stageScores.length > 0 ? (
                      <div className="h-80">
                        <Bar data={barData} options={barOptions} />
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                        <p className="text-yellow-700">
                          Não há dados de desempenho disponíveis para este candidato.
                        </p>
                      </div>
                    )}
                    <div className="mt-4 text-sm text-gray-500">
                      <p>Este gráfico mostra o número de respostas corretas em comparação com o total de questões em cada etapa.</p>
                    </div>
                  </div>
                  
                  {/* Tabela de Desempenho Detalhado */}
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-secondary-800 mb-4">Desempenho Detalhado</h3>
                    {!candidate.completed ? (
                      <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                        <p className="text-blue-700">
                          O candidato ainda não realizou o teste. Os dados de desempenho estarão disponíveis após a conclusão da avaliação.
                        </p>
                      </div>
                    ) : !candidate.stageScores || candidate.stageScores.length === 0 ? (
                      <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                        <p className="text-yellow-700">
                          Não há dados de desempenho disponíveis para este candidato, mesmo tendo completado o teste.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                          <thead className="bg-secondary-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                Etapa
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                Corretas
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                Total
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                Percentual
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-secondary-200">
                            {candidate.stageScores?.map((stage, index) => (
                              <tr key={stage.id} className={index % 2 === 0 ? 'bg-white' : 'bg-secondary-50'}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                                  {stage.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                  {stage.correct}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                  {stage.total}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                  <div className="flex items-center">
                                    <span className="mr-2">{parseFloat(stage.percentage.toFixed(1))}%</span>
                                    <div className="w-24 bg-secondary-200 rounded-full h-2.5">
                                      <div 
                                        className={`h-2.5 rounded-full ${
                                          stage.percentage >= 80 ? 'bg-green-500' : 
                                          stage.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${stage.percentage}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {!candidate.completed ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                      Aguardando Respostas
                                    </span>
                                  ) : stage.percentage >= 80 ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                      Excelente
                                    </span>
                                  ) : stage.percentage >= 60 ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                      Satisfatório
                                    </span>
                                  ) : (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                      Precisa Melhorar
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            
                            {/* Linha de pontuação geral */}
                            <tr className="bg-secondary-100">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                                <strong>Pontuação Geral</strong>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                {candidate.stageScores?.reduce((acc, stage) => acc + stage.correct, 0) || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                {candidate.stageScores?.reduce((acc, stage) => acc + stage.total, 0) || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                <div className="flex items-center">
                                  {/* Calcular a porcentagem geral com base nos acertos e total de questões */}
                                  {(() => {
                                    const totalCorrect = candidate.stageScores?.reduce((acc, stage) => acc + stage.correct, 0) || 0;
                                    const totalQuestions = candidate.stageScores?.reduce((acc, stage) => acc + stage.total, 0) || 0;
                                    const percentage = totalQuestions > 0 ? parseFloat((totalCorrect / totalQuestions * 100).toFixed(1)) : 0;
                                    return (
                                      <>
                                        <span className="mr-2">{percentage}%</span>
                                        <div className="w-24 bg-secondary-200 rounded-full h-2.5">
                                          <div 
                                            className={`h-2.5 rounded-full ${
                                              percentage >= 80 ? 'bg-green-500' : 
                                              percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${percentage}%` }}
                                          ></div>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {!candidate.completed ? (
                                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                    Aguardando Respostas
                                  </span>
                                ) : (() => {
                                  const totalCorrect = candidate.stageScores?.reduce((acc, stage) => acc + stage.correct, 0) || 0;
                                  const totalQuestions = candidate.stageScores?.reduce((acc, stage) => acc + stage.total, 0) || 0;
                                  const percentage = totalQuestions > 0 ? parseFloat((totalCorrect / totalQuestions * 100).toFixed(1)) : 0;
                                  
                                  if (percentage >= 80) {
                                    return (
                                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                        Aprovado
                                      </span>
                                    );
                                  } else if (percentage >= 60) {
                                    return (
                                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                        Consideração
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                        Reprovado
                                      </span>
                                    );
                                  }
                                })()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  
                  {/* Recomendações baseadas no desempenho */}
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-secondary-800 mb-4">Recomendações</h3>
                    <div className="space-y-4">
                      {!candidate.completed ? (
                        <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                          <h4 className="font-medium text-blue-800">Aguardando Respostas</h4>
                          <p className="mt-2 text-blue-700">
                            Este candidato ainda não realizou o teste. As recomendações serão geradas após a conclusão da avaliação.
                          </p>
                        </div>
                      ) : (() => {
                        // Calcular a porcentagem geral com base nos acertos e total de questões
                        const totalCorrect = candidate.stageScores?.reduce((acc, stage) => acc + stage.correct, 0) || 0;
                        const totalQuestions = candidate.stageScores?.reduce((acc, stage) => acc + stage.total, 0) || 0;
                        const percentage = totalQuestions > 0 ? parseFloat((totalCorrect / totalQuestions * 100).toFixed(1)) : 0;
                        
                        if (percentage >= 80) {
                          return (
                            <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
                              <h4 className="font-medium text-green-800">Candidato Recomendado</h4>
                              <p className="mt-2 text-green-700">
                                Este candidato demonstrou excelente desempenho na avaliação. Recomendamos prosseguir com o processo de contratação.
                              </p>
                            </div>
                          );
                        } else if (percentage >= 60) {
                          return (
                            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                              <h4 className="font-medium text-yellow-800">Candidato para Consideração</h4>
                              <p className="mt-2 text-yellow-700">
                                Este candidato demonstrou desempenho satisfatório. Recomendamos avaliar outros aspectos como experiência e entrevista antes de tomar uma decisão.
                              </p>
                            </div>
                          );
                        } else {
                          return (
                            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
                              <h4 className="font-medium text-red-800">Candidato Não Recomendado</h4>
                              <p className="mt-2 text-red-700">
                                Este candidato não atingiu a pontuação mínima necessária. Recomendamos considerar outros candidatos.
                              </p>
                            </div>
                          );
                        }
                      })()
                      }
                      
                      {/* Áreas para desenvolvimento */}
                      {candidate.completed && (
                        <div className="mt-4">
                          <h4 className="font-medium text-secondary-800">Áreas para Desenvolvimento:</h4>
                          <ul className="mt-2 space-y-1 list-disc list-inside text-secondary-600">
                            {candidate.stageScores?.filter(stage => stage.percentage < 60).map(stage => (
                              <li key={stage.id}>
                                {stage.name} ({stage.percentage}%) - Necessita aprimoramento
                              </li>
                            ))}
                            {candidate.stageScores?.filter(stage => stage.percentage < 60).length === 0 && (
                              <li>Não foram identificadas áreas críticas para desenvolvimento.</li>
                            )}
                          </ul>
                        </div>
                      )}
                      
                      {/* Pontos fortes */}
                      {candidate.completed && (
                        <div className="mt-4">
                          <h4 className="font-medium text-secondary-800">Pontos Fortes:</h4>
                          <ul className="mt-2 space-y-1 list-disc list-inside text-secondary-600">
                            {candidate.stageScores?.filter(stage => stage.percentage >= 80).map(stage => (
                              <li key={stage.id}>
                                {stage.name} ({stage.percentage}%) - Excelente desempenho
                              </li>
                            ))}
                            {candidate.stageScores?.filter(stage => stage.percentage >= 80).length === 0 && (
                              <li>Não foram identificados pontos de excelência.</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:space-x-8">
                    <div className="md:w-2/3 space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Nome Completo
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Cargo Pretendido
                        </label>
                        <input
                          type="text"
                          name="position"
                          value={formData.position}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Status
                        </label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                        >
                          <option value="PENDING">Pendente</option>
                          <option value="APPROVED">Aprovado</option>
                          <option value="REJECTED">Rejeitado</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Observações
                        </label>
                        <textarea
                          name="observations"
                          value={formData.observations}
                          onChange={handleChange}
                          rows={5}
                          className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                        ></textarea>
                      </div>
                    </div>
                    
                    <div className="md:w-1/3 space-y-6 mt-6 md:mt-0">
                      {/* Foto do Candidato */}
                      {candidate.photoUrl && (
                        <div className="bg-white border border-secondary-200 rounded-lg p-4 mb-4">
                          <h3 className="text-lg font-semibold text-secondary-800 mb-3">Foto do Candidato</h3>
                          <div className="flex flex-col items-center">
                            <div 
                              className="relative w-48 h-auto rounded-lg overflow-hidden border border-secondary-200 cursor-pointer"
                              onClick={() => setShowPhotoModal(true)}
                            >
                              <img 
                                src={candidate.photoUrl} 
                                alt={`Foto de ${candidate.name}`}
                                className="max-w-full w-full object-contain rounded-lg"
                              />
                            </div>
                            <p className="text-sm text-secondary-600 mt-2">Clique na foto para visualizar em tamanho completo</p>
                          </div>
                        </div>
                      )}
                      <div className="bg-white border border-secondary-200 rounded-lg p-4 mb-4">
                        <h3 className="text-lg font-semibold text-secondary-800 mb-3">Informações do Convite</h3>
                        <div className="space-y-3">
                          {/* Seleção de Teste */}
                          <div className="bg-white p-3 rounded-md border border-secondary-200">
                            <label className="block text-sm text-secondary-600 mb-1">
                              Selecione o Teste:
                            </label>
                            <div className="relative">
                              <select
                                name="testId"
                                value={formData.testId}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-secondary-300 rounded-md appearance-none"
                                disabled={isLoadingTests}
                              >
                                <option value="">Selecione um teste</option>
                                {availableTests.map(test => (
                                  <option key={test.id} value={test.id}>
                                    {test.title}
                                  </option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                {isLoadingTests ? (
                                  <div className="animate-spin h-4 w-4 border-2 border-primary-500 rounded-full border-t-transparent"></div>
                                ) : (
                                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            {formData.testId && (
                              <div className="mt-2 text-xs text-green-600">
                                <div className="flex items-center">
                                  <svg className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Teste selecionado
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="bg-white p-3 rounded-md border border-secondary-200">
                            <span className="text-sm text-secondary-600">Código do Convite:</span>
                            <div className="flex items-center justify-between mt-1">
                              <p className="font-medium text-lg text-primary-600">{candidate?.inviteCode}</p>
                              <button
                                onClick={generateNewInvite}
                                disabled={isGeneratingInvite}
                                className={`px-3 py-1 text-sm ${
                                  isGeneratingInvite 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                    : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                                } rounded`}
                              >
                                {isGeneratingInvite 
                                  ? 'Gerando...' 
                                  : candidate?.inviteCode 
                                    ? 'Gerar Novo' 
                                    : 'Gerar Código'
                                }
                              </button>
                            </div>
                            {candidate.inviteCode && (
                              <div className="mt-2">
                                <button
                                  onClick={handleShare}
                                  className="w-full px-3 py-1 text-sm bg-green-50 text-green-600 hover:bg-green-100 rounded flex items-center justify-center"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                                  </svg>
                                  Compartilhar
                                </button>
                              </div>
                            )}
                            {candidate.inviteExpires && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-secondary-500 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Expira em: {format(new Date(candidate.inviteExpires), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </p>
                                <p className="text-xs text-secondary-500 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Status: {candidate.inviteSent ? 'Enviado' : 'Não enviado'}
                                </p>
                                <p className="text-xs text-secondary-500 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                  </svg>
                                  Tentativas: {candidate.inviteAttempts} de 5
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <span className="text-sm text-secondary-600">Data do Teste:</span>
                            <p className="font-medium">{format(new Date(candidate.testDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                          </div>
                          
                          {candidate.interviewDate && (
                            <div>
                              <span className="text-sm text-secondary-600">Data da Entrevista:</span>
                              <p className="font-medium">{format(new Date(candidate.interviewDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                            </div>
                          )}
                          
                          <div>
                            <span className="text-sm text-secondary-600">Status do Teste:</span>
                            <p className="font-medium">{candidate.completed ? 'Completo' : 'Incompleto'}</p>
                          </div>
                          
                          {candidate.completed && candidate.stageScores && candidate.stageScores.length > 0 && (
                            <div>
                              <span className="text-sm text-secondary-600">Pontuação Geral:</span>
                              <p className="font-medium">
                                {typeof candidate.score === 'object' 
                                  ? candidate.score.percentage 
                                  : parseFloat((candidate.score || 0).toFixed(1))}%</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Avaliação
                        </label>
                        <div className="flex items-center">
                          <Rating
                            name="candidate-rating"
                            value={parseFloat(formData.rating) || 0}
                            precision={0.5}
                            onChange={(_, newValue) => {
                              setFormData(prev => ({ 
                                ...prev, 
                                rating: newValue ? newValue.toString() : '0' 
                              }));
                            }}
                            size="large"
                          />
                          <div className="ml-2 text-sm text-secondary-700">
                            {formData.rating === '0' ? 'Sem avaliação' : 
                             `${formData.rating} ${formData.rating === '1' ? 'estrela' : 'estrelas'}`}
                          </div>
                        </div>
                      </div>
                      
                      {candidate.infoJobsLink && (
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-1">
                            Perfil InfoJobs
                          </label>
                          <Link 
                            href={candidate.infoJobsLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 flex items-center"
                          >
                            <span>Ver perfil</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                            </svg>
                          </Link>
                        </div>
                      )}
                      
                      {candidate.resumeFile && (
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-1">
                            Currículo
                          </label>
                          <Link 
                            href={candidate.resumeFile} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 flex items-center"
                          >
                            <span>Ver currículo</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-1H4a1 1 0 00-1 1v1H0a2 2 0 000 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1a2 2 0 00-2 2v3a2 2 0 002 2h3a2 2 0 002-2V7a1 1 0 10-2 0v3a1 1 0 10-2 0V7a1 1 0 10-2 0v3a2 2 0 002 2h3z" />
                            </svg>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-4 mt-6 justify-end">
                    <button
                      onClick={handleSave}
                      className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 font-medium shadow-sm"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="ml-3 text-secondary-700">Carregando dados do candidato...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mt-6">
            {error}
          </div>
        )}
      </main>
      
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-secondary-800">
                {isNewCodeGenerated ? 'Novo Código Gerado' : 'Compartilhar Convite'}
              </h2>
              <button 
                onClick={() => {
                  setIsShareModalOpen(false);
                  setIsNewCodeGenerated(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {isNewCodeGenerated && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm leading-5 font-medium text-green-800">
                      Código de convite gerado com sucesso!
                    </p>
                    <p className="text-sm leading-5 text-green-700 mt-1">
                      Você pode compartilhar este código com o candidato usando as opções abaixo.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <div className="bg-white border border-secondary-200 rounded-lg p-4 mb-4">
                <div className="flex flex-col">
                  <div className="mb-2">
                    <span className="text-sm text-secondary-600">Código de Convite:</span>
                    <p className="text-2xl font-bold text-primary-600">{candidate?.inviteCode}</p>
                  </div>
                  
                  {candidate?.testId && (
                    <div className="mb-2">
                      <span className="text-sm text-secondary-600">Teste Selecionado:</span>
                      <p className="text-md font-medium text-secondary-800">
                        {availableTests.find(test => test.id === candidate.testId)?.title || 'Teste não encontrado'}
                      </p>
                    </div>
                  )}
                  
                  {candidate?.inviteExpires && (
                    <div>
                      <span className="text-sm text-secondary-600">Expira em:</span>
                      <p className="text-md font-medium text-secondary-800">
                        {format(new Date(candidate.inviteExpires), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={shareByEmail}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                Enviar por Email
              </button>
              
              <button
                onClick={shareByWhatsApp}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Compartilhar no WhatsApp
              </button>
              
              <div className="pt-4 mt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsShareModalOpen(false);
                    setIsNewCodeGenerated(false);
                  }}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold text-secondary-800">
                Foto de {candidate?.name}
              </h2>
              <button 
                onClick={() => setShowPhotoModal(false)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              <img 
                src={candidate?.photoUrl} 
                alt={`Foto de ${candidate?.name}`}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
            
            <div className="p-4 border-t">
              <p className="text-sm text-secondary-600">
                {candidate?.position ? `Candidato para ${candidate.position}` : 'Candidato'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CandidateDetails