import { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import AdminLayout from '../../../components/admin/AdminLayout';
import Breadcrumbs, { useBreadcrumbs } from '../../../components/admin/Breadcrumbs';
import ContextualNavigation, { useContextualNavigation } from '../../../components/admin/ContextualNavigation';
import { CogIcon, AcademicCapIcon, DocumentTextIcon, ClockIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

interface TrainingSettings {
  certificateValidity: number;
  automaticEnrollment: boolean;
  notifyCompletions: boolean;
  reminderFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  defaultPassingScore: number;
}

const SettingsPage: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const breadcrumbItems = useBreadcrumbs();
  const contextualNav = useContextualNavigation();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<TrainingSettings>({
    certificateValidity: 12, // meses
    automaticEnrollment: false,
    notifyCompletions: true,
    reminderFrequency: 'weekly',
    defaultPassingScore: 70
  });

  // Buscar configurações atuais
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
    
    if (status === 'authenticated') {
      // Simulação de busca de configurações (em um ambiente real, isso viria da API)
      // axios.get('/api/admin/training/settings')
      //   .then(response => {
      //     setSettings(response.data);
      //     setLoading(false);
      //   })
      //   .catch(err => {
      //     console.error('Erro ao buscar configurações:', err);
      //     setError('Ocorreu um erro ao buscar as configurações.');
      //     setLoading(false);
      //   });
      
      // Simulação para desenvolvimento
      setTimeout(() => {
        setSettings({
          certificateValidity: 12,
          automaticEnrollment: false,
          notifyCompletions: true,
          reminderFrequency: 'weekly',
          defaultPassingScore: 70
        });
        setLoading(false);
      }, 500);
    }
  }, [status, router]);

  // Salvar configurações
  const handleSaveSettings = () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    // Simulação de salvamento (em um ambiente real, isso seria enviado para a API)
    // axios.put('/api/admin/training/settings', settings)
    //   .then(() => {
    //     setSuccessMessage('Configurações salvas com sucesso!');
    //     setSaving(false);
    //   })
    //   .catch(err => {
    //     console.error('Erro ao salvar configurações:', err);
    //     setError(err.response?.data?.error || 'Ocorreu um erro ao salvar as configurações.');
    //     setSaving(false);
    //   });
    
    // Simulação para desenvolvimento
    setTimeout(() => {
      setSuccessMessage('Configurações salvas com sucesso!');
      setSaving(false);
      
      // Limpar mensagem de sucesso após alguns segundos
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    }, 800);
  };

  // Função para atualizar configurações
  const handleChange = (field: keyof TrainingSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (status === 'loading' || loading) {
    return (
      <AdminLayout activeSection="treinamento">
        <Breadcrumbs items={[
          { label: 'Início', href: '/admin/training/dashboard' },
          { label: 'Configurações', href: '/admin/training/settings' }
        ]} />
        <ContextualNavigation />
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activeSection="treinamento">
      <Breadcrumbs items={[
        { label: 'Início', href: '/admin/training/dashboard' },
        { label: 'Configurações', href: '/admin/training/settings' }
      ]} />
      <ContextualNavigation />
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary-900 mb-2">Configurações de Treinamento</h1>
          {contextualNav && (
            <div className="mt-4">
              {contextualNav.prev && (
                <a href={contextualNav.prev.href} className="text-sm text-secondary-600 hover:text-primary-600">
                  ← {contextualNav.prev.label}
                </a>
              )}
              {contextualNav.related && contextualNav.related.length > 0 && (
                <div className="mt-2">
                  <span className="text-xs text-secondary-500">Links relacionados:</span>
                  <ul className="mt-1 space-y-1">
                    {contextualNav.related.map((link, index) => (
                      <li key={index}>
                        <a href={link.href} className="text-sm text-secondary-600 hover:text-primary-600">
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            <p>{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-700">
            <p>{successMessage}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-secondary-800 mb-4 flex items-center">
            <CheckBadgeIcon className="w-6 h-6 mr-2 text-primary-500" />
            Certificados
          </h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Validade dos certificados (meses)
            </label>
            <input
              type="number"
              min="0"
              max="60"
              value={settings.certificateValidity}
              onChange={(e) => handleChange('certificateValidity', parseInt(e.target.value))}
              className="w-full sm:w-64 px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="mt-1 text-sm text-secondary-500">
              Define por quanto tempo os certificados emitidos serão válidos. Use 0 para certificados sem data de expiração.
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Nota mínima para aprovação (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={settings.defaultPassingScore}
              onChange={(e) => handleChange('defaultPassingScore', parseInt(e.target.value))}
              className="w-full sm:w-64 px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="mt-1 text-sm text-secondary-500">
              Define a nota mínima padrão para aprovação em testes e cursos.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-secondary-800 mb-4 flex items-center">
            <AcademicCapIcon className="w-6 h-6 mr-2 text-primary-500" />
            Matrículas
          </h2>
          
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.automaticEnrollment}
                onChange={(e) => handleChange('automaticEnrollment', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
              />
              <span className="ml-2 text-sm text-secondary-700">Matrícula automática para novos funcionários</span>
            </label>
            <p className="mt-1 text-sm text-secondary-500 ml-6">
              Quando ativado, novos funcionários serão automaticamente matriculados nos cursos obrigatórios.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-secondary-800 mb-4 flex items-center">
            <DocumentTextIcon className="w-6 h-6 mr-2 text-primary-500" />
            Notificações
          </h2>
          
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.notifyCompletions}
                onChange={(e) => handleChange('notifyCompletions', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
              />
              <span className="ml-2 text-sm text-secondary-700">Notificar conclusões de curso</span>
            </label>
            <p className="mt-1 text-sm text-secondary-500 ml-6">
              Envia notificações por e-mail quando um aluno conclui um curso.
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Frequência de lembretes
            </label>
            <select
              value={settings.reminderFrequency}
              onChange={(e) => handleChange('reminderFrequency', e.target.value as 'daily' | 'weekly' | 'monthly' | 'never')}
              className="w-full sm:w-64 px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="daily">Diariamente</option>
              <option value="weekly">Semanalmente</option>
              <option value="monthly">Mensalmente</option>
              <option value="never">Nunca</option>
            </select>
            <p className="mt-1 text-sm text-secondary-500">
              Define com que frequência os lembretes de cursos pendentes serão enviados.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Salvando...
              </>
            ) : (
              <>
                <CogIcon className="h-4 w-4 mr-1" />
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SettingsPage;
