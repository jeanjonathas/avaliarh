import { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import AdminLayout from '../../../components/admin/AdminLayout';
import Breadcrumbs, { useBreadcrumbs } from '../../../components/admin/Breadcrumbs';
import ContextualNavigation, { useContextualNavigation } from '../../../components/admin/ContextualNavigation';
import { ChartBarIcon, DocumentTextIcon, ArrowDownTrayIcon, CalendarIcon, UserGroupIcon, AcademicCapIcon, ClipboardDocumentListIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

// Tipos de relatórios disponíveis
type ReportType = 'course_completion' | 'student_progress' | 'test_results' | 'certificate_issuance' | 'enrollment_stats';

interface ReportOption {
  id: ReportType;
  name: string;
  description: string;
  icon: React.ReactNode;
  formats: string[];
}

interface Course {
  id: string;
  name: string;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

const ReportsPage: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const breadcrumbItems = useBreadcrumbs();
  const contextualNav = useContextualNavigation();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReportUrl, setGeneratedReportUrl] = useState<string | null>(null);

  // Opções de relatórios disponíveis
  const reportOptions: ReportOption[] = [
    {
      id: 'course_completion',
      name: 'Conclusão de Cursos',
      description: 'Relatório detalhado sobre a conclusão de cursos, incluindo taxas de aprovação e tempo médio de conclusão.',
      icon: <AcademicCapIcon className="h-8 w-8 text-blue-500" />,
      formats: ['pdf', 'excel', 'csv'],
    },
    {
      id: 'student_progress',
      name: 'Progresso dos Alunos',
      description: 'Análise do progresso dos alunos em diferentes cursos, incluindo tempo gasto em cada módulo e notas em testes.',
      icon: <UserGroupIcon className="h-8 w-8 text-green-500" />,
      formats: ['pdf', 'excel', 'csv'],
    },
    {
      id: 'test_results',
      name: 'Resultados de Testes',
      description: 'Estatísticas detalhadas sobre os resultados de testes, incluindo distribuição de notas e questões mais erradas.',
      icon: <ClipboardDocumentListIcon className="h-8 w-8 text-yellow-500" />,
      formats: ['pdf', 'excel', 'csv'],
    },
    {
      id: 'certificate_issuance',
      name: 'Emissão de Certificados',
      description: 'Relatório sobre certificados emitidos, incluindo datas de emissão e status de validação.',
      icon: <DocumentTextIcon className="h-8 w-8 text-purple-500" />,
      formats: ['pdf', 'excel'],
    },
    {
      id: 'enrollment_stats',
      name: 'Estatísticas de Matrículas',
      description: 'Análise das matrículas por curso, departamento e período, incluindo tendências e comparações.',
      icon: <ChartBarIcon className="h-8 w-8 text-red-500" />,
      formats: ['pdf', 'excel', 'csv'],
    },
  ];

  // Buscar cursos
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
    
    if (status === 'authenticated') {
      // Buscar todos os cursos
      axios.get('/api/admin/training/courses')
        .then(response => {
          const coursesData = Array.isArray(response.data) ? response.data : [];
          setCourses(coursesData);
          setLoading(false);
        })
        .catch(err => {
          console.error('Erro ao buscar cursos:', err);
          setError('Ocorreu um erro ao buscar os cursos.');
          setLoading(false);
        });
    }
  }, [status, router]);

  // Função para gerar relatório
  const handleGenerateReport = () => {
    if (!selectedReportType) {
      setError('Por favor, selecione um tipo de relatório.');
      return;
    }
    
    setIsGenerating(true);
    setGeneratedReportUrl(null);
    
    // Preparar parâmetros do relatório
    const reportParams = {
      reportType: selectedReportType,
      format: selectedFormat,
      courseId: selectedCourseId || undefined,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    };
    
    // Chamar API para gerar relatório
    axios.post('/api/admin/training/reports/generate', reportParams)
      .then(response => {
        setGeneratedReportUrl(response.data.reportUrl);
        setIsGenerating(false);
      })
      .catch(err => {
        console.error('Erro ao gerar relatório:', err);
        setError(err.response?.data?.error || 'Ocorreu um erro ao gerar o relatório.');
        setIsGenerating(false);
      });
  };

  // Função para obter a descrição do formato
  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'pdf':
        return 'Documento PDF para visualização e impressão';
      case 'excel':
        return 'Planilha Excel para análise de dados';
      case 'csv':
        return 'Arquivo CSV para importação em outros sistemas';
      default:
        return '';
    }
  };

  // Função para obter o ícone do formato
  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <DocumentTextIcon className="h-5 w-5 text-red-500" />;
      case 'excel':
        return <ChartBarIcon className="h-5 w-5 text-green-500" />;
      case 'csv':
        return <DocumentTextIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <DocumentTextIcon className="h-5 w-5" />;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <AdminLayout activeSection="treinamento">
        <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-secondary-600">Carregando...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Será redirecionado pelo useEffect
  }

  return (
    <AdminLayout activeSection="treinamento">
      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} />
        <ContextualNavigation 
          prevLink={contextualNav.prev} 
          nextLink={contextualNav.next} 
          relatedLinks={contextualNav.related} 
        />
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-secondary-900">Relatórios de Treinamento</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Painel de seleção de relatório */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">Tipos de Relatórios</h2>
              
              <div className="space-y-4">
                {reportOptions.map(option => (
                  <div 
                    key={option.id}
                    onClick={() => setSelectedReportType(option.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedReportType === option.id 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-secondary-200 hover:border-primary-300 hover:bg-secondary-50'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        {option.icon}
                      </div>
                      <div className="ml-4">
                        <h3 className="font-medium text-secondary-900">{option.name}</h3>
                        <p className="text-sm text-secondary-600 mt-1">{option.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Painel de configuração do relatório */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">
                {selectedReportType 
                  ? `Configurar Relatório: ${reportOptions.find(o => o.id === selectedReportType)?.name}` 
                  : 'Configurar Relatório'}
              </h2>
              
              {!selectedReportType ? (
                <div className="text-center py-8">
                  <DocumentTextIcon className="h-16 w-16 mx-auto text-secondary-400 mb-4" />
                  <h3 className="text-lg font-medium text-secondary-700 mb-2">Selecione um tipo de relatório</h3>
                  <p className="text-secondary-500">
                    Escolha um tipo de relatório no painel à esquerda para configurar os parâmetros.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Seleção de curso */}
                  <div>
                    <label htmlFor="courseSelect" className="block text-sm font-medium text-secondary-700 mb-2">
                      Curso:
                    </label>
                    <select
                      id="courseSelect"
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Todos os cursos</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Seleção de período */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Período:
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="startDate" className="block text-xs text-secondary-500 mb-1">
                          Data inicial:
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <CalendarIcon className="h-5 w-5 text-secondary-400" />
                          </div>
                          <input
                            type="date"
                            id="startDate"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className="block w-full pl-10 px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="endDate" className="block text-xs text-secondary-500 mb-1">
                          Data final:
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <CalendarIcon className="h-5 w-5 text-secondary-400" />
                          </div>
                          <input
                            type="date"
                            id="endDate"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            className="block w-full pl-10 px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Seleção de formato */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Formato do Relatório:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedReportType && reportOptions.find(o => o.id === selectedReportType)?.formats.map(format => (
                        <div
                          key={format}
                          onClick={() => setSelectedFormat(format)}
                          className={`p-3 border rounded-md cursor-pointer transition-all duration-200 ${
                            selectedFormat === format 
                              ? 'border-primary-500 bg-primary-50' 
                              : 'border-secondary-200 hover:border-primary-300'
                          }`}
                        >
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              {getFormatIcon(format)}
                            </div>
                            <div className="ml-3">
                              <h4 className="font-medium text-secondary-900 uppercase">{format}</h4>
                              <p className="text-xs text-secondary-500">{getFormatDescription(format)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Botão de geração */}
                  <div className="pt-4 border-t border-secondary-200">
                    <button
                      onClick={handleGenerateReport}
                      disabled={isGenerating}
                      className={`w-full px-4 py-3 rounded-md text-white font-medium flex items-center justify-center ${
                        isGenerating 
                          ? 'bg-primary-400 cursor-not-allowed' 
                          : 'bg-primary-600 hover:bg-primary-700 transition-colors duration-200'
                      }`}
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          Gerando relatório...
                        </>
                      ) : (
                        <>
                          <DocumentTextIcon className="h-5 w-5 mr-2" />
                          Gerar Relatório
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Link para download do relatório gerado */}
                  {generatedReportUrl && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-green-800">Relatório gerado com sucesso!</h3>
                          <div className="mt-2">
                            <a
                              href={generatedReportUrl}
                              download
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                              Baixar Relatório
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Relatórios recentes */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">Relatórios Recentes</h2>
              
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-secondary-200">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Relatório
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Formato
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-secondary-200">
                    {/* Exemplo de relatórios recentes */}
                    <tr className="hover:bg-secondary-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <AcademicCapIcon className="h-5 w-5 text-blue-500 mr-2" />
                          <span className="text-sm font-medium text-secondary-900">Conclusão de Cursos</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                        {new Date().toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getFormatIcon('pdf')}
                          <span className="ml-2 text-sm text-secondary-700">PDF</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a href="#" className="text-primary-600 hover:text-primary-800">
                          Download
                        </a>
                      </td>
                    </tr>
                    <tr className="hover:bg-secondary-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserGroupIcon className="h-5 w-5 text-green-500 mr-2" />
                          <span className="text-sm font-medium text-secondary-900">Progresso dos Alunos</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                        {new Date(new Date().setDate(new Date().getDate() - 2)).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getFormatIcon('excel')}
                          <span className="ml-2 text-sm text-secondary-700">Excel</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a href="#" className="text-primary-600 hover:text-primary-800">
                          Download
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ReportsPage;
