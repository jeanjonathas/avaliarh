import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Candidate } from '../types'
import toast from 'react-hot-toast'
import Image from 'next/image'

interface Test {
  id: string;
  title: string;
  description: string;
  timeLimit: number | null;
  active: boolean;
}

interface SelectionProcess {
  id: string;
  name: string;
  description?: string;
  cutoffScore?: number;
  evaluationType: string;
  stages?: ProcessStage[];
}

interface ProcessStage {
  id: string;
  name: string;
  testId?: string;
}

export interface CandidateInfoTabProps {
  candidate: Candidate
  onUpdate?: () => void
}

export const CandidateInfoTab = ({ candidate, onUpdate }: CandidateInfoTabProps) => {
  const [formData, setFormData] = useState({
    name: candidate.name || '',
    email: candidate.email || '',
    phone: candidate.phone || '',
    position: candidate.position || '',
    status: candidate.status || 'PENDING',
    observations: candidate.observations || '',
    testId: candidate.testId || '',
    processId: candidate.processId || '',
    requestPhoto: candidate.requestPhoto !== undefined ? candidate.requestPhoto : true,
    showResults: candidate.showResults !== undefined ? candidate.showResults : true
  })

  const [loading, setLoading] = useState(true)
  const [tests, setTests] = useState<Test[]>([])
  const [processes, setProcesses] = useState<SelectionProcess[]>([])
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isNewCodeGenerated, setIsNewCodeGenerated] = useState(false)
  const [linkType, setLinkType] = useState<'process' | 'test'>(formData.processId ? 'process' : 'test')
  const [currentInviteCode, setCurrentInviteCode] = useState(candidate?.inviteCode || '')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [testsResponse, processesResponse] = await Promise.all([
          fetch('/api/admin/tests', { credentials: 'include' }),
          fetch('/api/admin/processes', { credentials: 'include' })
        ]);

        const testsData = await testsResponse.json();
        const processesData = await processesResponse.json();

        if (testsData.success) {
          setTests(testsData.tests);
        }

        if (processesResponse.ok) {
          setProcesses(processesData);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados necessários', {
          position: 'bottom-center',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    if (name === 'processId' && value && linkType === 'process') {
      // When a process is selected, find the associated test
      const selectedProcess = processes.find(process => process.id === value);
      const testId = selectedProcess?.stages?.find(stage => stage.testId)?.testId || '';
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        testId: testId
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSwitchChange = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [name]: e.target.checked
    }));
  };

  const handleLinkTypeChange = (type: 'process' | 'test') => {
    setLinkType(type);
    
    // Reset the process and test selections when changing link type
    setFormData(prev => ({
      ...prev,
      processId: '',
      testId: ''
    }));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch(`/api/admin/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Informações do candidato atualizadas com sucesso!', {
          position: 'bottom-center',
        });
        onUpdate?.()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao atualizar informações', {
          position: 'bottom-center',
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar candidato:', error)
      toast.error('Erro ao atualizar informações', {
        position: 'bottom-center',
      });
    } finally {
      setIsSaving(false)
    }
  }

  const generateNewInvite = async () => {
    // Prevent generating a new code if one already exists
    if (currentInviteCode) {
      toast('Este candidato já possui um código de convite', {
        icon: 'ℹ️',
        style: {
          background: '#EFF6FF',
          border: '1px solid #3B82F6',
          color: '#1E40AF',
        },
        position: 'bottom-center',
      });
      return;
    }

    if ((linkType === 'process' && !formData.processId) || (linkType === 'test' && !formData.testId)) {
      toast.error('Selecione um processo ou teste antes de gerar o convite', {
        position: 'bottom-center',
      });
      return;
    }

    setIsGeneratingInvite(true);

    try {
      const response = await fetch(`/api/admin/candidates/${candidate.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          processId: linkType === 'process' ? formData.processId : null,
          testId: formData.testId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentInviteCode(data.inviteCode);
        toast.success('Convite gerado com sucesso!', {
          position: 'bottom-center',
        });
        onUpdate?.();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao gerar convite', {
          position: 'bottom-center',
        });
      }
    } catch (error) {
      console.error('Erro ao gerar convite:', error);
      toast.error('Erro ao gerar convite', {
        position: 'bottom-center',
      });
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const shareByWhatsApp = () => {
    if (!currentInviteCode) {
      toast.error('Nenhum código de convite disponível', {
        position: 'bottom-center',
      });
      return;
    }

    const testLink = `${window.location.origin}/test/${currentInviteCode}`;
    const message = `Olá ${formData.name}, você foi convidado para participar de um teste em nossa plataforma. Acesse: ${testLink}`;
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappLink, '_blank');
    toast.success('Link preparado para compartilhamento via WhatsApp', {
      position: 'bottom-center',
    });
  };

  // Update currentInviteCode when candidate.inviteCode changes
  useEffect(() => {
    setCurrentInviteCode(candidate?.inviteCode || '');
  }, [candidate?.inviteCode]);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
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
                Telefone
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
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

            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requestPhoto"
                  name="requestPhoto"
                  checked={formData.requestPhoto}
                  onChange={handleSwitchChange('requestPhoto')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                />
                <label htmlFor="requestPhoto" className="ml-2 block text-sm text-secondary-700">
                  Solicitar foto do candidato
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showResults"
                  name="showResults"
                  checked={formData.showResults}
                  onChange={handleSwitchChange('showResults')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                />
                <label htmlFor="showResults" className="ml-2 block text-sm text-secondary-700">
                  Mostrar resultados ao candidato
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className={`px-4 py-2 text-white rounded-md ${
                  isSaving
                    ? 'bg-primary-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
          
          <div className="md:w-1/3 space-y-6 mt-6 md:mt-0">
            {candidate.photoUrl && (
              <div className="bg-white border border-secondary-200 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-secondary-800 mb-3">Foto do Candidato</h3>
                <div className="flex flex-col items-center">
                  <div 
                    className="relative w-48 h-auto rounded-lg overflow-hidden border border-secondary-200 cursor-pointer"
                    onClick={() => setShowPhotoModal(true)}
                  >
                    <div className="relative w-full" style={{ aspectRatio: '1' }}>
                      <Image 
                        src={candidate.photoUrl} 
                        alt={`Foto de ${candidate.name}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 192px"
                        style={{ objectFit: 'contain' }}
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-secondary-600 mt-2">Clique na foto para visualizar em tamanho completo</p>
                </div>
              </div>
            )}

            <div className="bg-white border border-secondary-200 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold text-secondary-800 mb-3">Informações do Convite</h3>
              
              {!currentInviteCode ? (
                // Exibir opções de configuração apenas se não houver convite gerado
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-md border border-secondary-200">
                    <label className="block text-sm text-secondary-600 mb-1">
                      Tipo de Vínculo:
                    </label>
                    <div className="flex space-x-4 mb-3">
                      <button
                        type="button"
                        onClick={() => handleLinkTypeChange('process')}
                        className={`px-3 py-2 text-sm rounded-md ${
                          linkType === 'process'
                            ? 'bg-primary-100 text-primary-700 border border-primary-300'
                            : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        Processo Seletivo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLinkTypeChange('test')}
                        className={`px-3 py-2 text-sm rounded-md ${
                          linkType === 'test'
                            ? 'bg-primary-100 text-primary-700 border border-primary-300'
                            : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        Teste Avulso
                      </button>
                    </div>
                  </div>

                  {linkType === 'process' && (
                    <div className="bg-white p-3 rounded-md border border-secondary-200">
                      <label className="block text-sm text-secondary-600 mb-1">
                        Processo Seletivo:
                      </label>
                      <select
                        name="processId"
                        value={formData.processId}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                        disabled={loading}
                      >
                        <option value="">Selecione um processo seletivo</option>
                        {processes.map((process) => (
                          <option key={process.id} value={process.id}>
                            {process.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {linkType === 'test' && (
                    <div className="bg-white p-3 rounded-md border border-secondary-200">
                      <label className="block text-sm text-secondary-600 mb-1">
                        Teste:
                      </label>
                      <select
                        name="testId"
                        value={formData.testId}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md"
                        disabled={loading}
                      >
                        <option value="">Selecione um teste</option>
                        {tests.map((test) => (
                          <option key={test.id} value={test.id}>
                            {test.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {linkType === 'process' && formData.processId && (
                    <div className="bg-white p-3 rounded-md border border-secondary-200">
                      <label className="block text-sm text-secondary-600 mb-1">
                        Teste associado ao processo:
                      </label>
                      <p className="px-3 py-2 bg-gray-50 rounded-md text-secondary-700">
                        {tests.find(t => t.id === formData.testId)?.title || 'Nenhum teste associado'}
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={generateNewInvite}
                      disabled={isGeneratingInvite || (linkType === 'process' && !formData.processId) || (linkType === 'test' && !formData.testId)}
                      className={`w-full px-4 py-2 text-white rounded-md ${
                        isGeneratingInvite || (linkType === 'process' && !formData.processId) || (linkType === 'test' && !formData.testId)
                          ? 'bg-primary-400 cursor-not-allowed'
                          : 'bg-primary-600 hover:bg-primary-700'
                      }`}
                    >
                      {isGeneratingInvite ? 'Gerando...' : 'Gerar Convite'}
                    </button>
                  </div>
                </div>
              ) : (
                // Exibir informações do convite já gerado
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-md border border-secondary-200">
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Tipo de Vínculo:
                    </label>
                    <p className="px-3 py-2 bg-gray-50 rounded-md text-secondary-700">
                      {formData.processId ? 'Processo Seletivo' : 'Teste Avulso'}
                    </p>
                  </div>
                  
                  {formData.processId && (
                    <div className="bg-white p-3 rounded-md border border-secondary-200">
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Processo Seletivo:
                      </label>
                      <p className="px-3 py-2 bg-gray-50 rounded-md text-secondary-700">
                        {processes.find(p => p.id === formData.processId)?.name || 'Processo não encontrado'}
                      </p>
                    </div>
                  )}
                  
                  {formData.testId && (
                    <div className="bg-white p-3 rounded-md border border-secondary-200">
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Teste:
                      </label>
                      <p className="px-3 py-2 bg-gray-50 rounded-md text-secondary-700">
                        {tests.find(t => t.id === formData.testId)?.title || 'Teste não encontrado'}
                      </p>
                    </div>
                  )}
                  
                  <div className="bg-white p-3 rounded-md border border-secondary-200">
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Código de Convite:
                    </label>
                    <div className="flex items-center">
                      <span className="px-3 py-2 bg-gray-50 rounded-md text-secondary-700 font-mono flex-grow">
                        {currentInviteCode}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-md border border-secondary-200">
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Link para o Teste:
                    </label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/test/${currentInviteCode}`}
                        className="w-full px-3 py-2 bg-gray-50 rounded-md text-secondary-700 font-mono"
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/test/${currentInviteCode}`);
                        toast.success('Link copiado para a área de transferência!', {
                          position: 'bottom-center',
                        });
                      }}
                      className="flex-1 px-4 py-2 bg-secondary-600 text-white rounded-md hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2"
                    >
                      Copiar Link
                    </button>
                    <button
                      type="button"
                      onClick={shareByWhatsApp}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                      Compartilhar via WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Share Modal */}
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
                    <p className="text-2xl font-bold text-primary-600">{currentInviteCode}</p>
                  </div>
                  
                  {linkType === 'process' && formData.processId && (
                    <div className="mb-2">
                      <span className="text-sm text-secondary-600">Processo Seletivo:</span>
                      <p className="text-md font-medium text-secondary-800">
                        {processes.find(process => process.id === formData.processId)?.name || 'Processo não encontrado'}
                      </p>
                    </div>
                  )}

                  <div className="mb-2">
                    <span className="text-sm text-secondary-600">Teste Selecionado:</span>
                    <p className="text-md font-medium text-secondary-800">
                      {tests.find(test => test.id === formData.testId)?.title || 'Teste não encontrado'}
                    </p>
                  </div>
                  
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
                onClick={shareByWhatsApp}
                className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
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

      {showPhotoModal && candidate.photoUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-white rounded-lg p-4">
            <button
              onClick={() => setShowPhotoModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="relative w-full h-[80vh]">
              <Image
                src={candidate.photoUrl}
                alt={`Foto de ${candidate.name}`}
                fill
                sizes="(max-width: 768px) 100vw, 80vw"
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
