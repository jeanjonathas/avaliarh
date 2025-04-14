import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { toast } from 'react-hot-toast';

export default function CalculadoraCompatibilidade() {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [candidateData, setCandidateData] = useState<any>(null);
  const [candidateResponses, setCandidateResponses] = useState<any>(null);
  const [candidateResults, setCandidateResults] = useState<any>(null);
  const [candidatePerformance, setCandidatePerformance] = useState<any>(null);

  // Carregar lista de candidatos
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const response = await fetch('/api/admin/candidates', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Erro ao carregar candidatos');
        }

        const data = await response.json();
        setCandidates(data);
      } catch (error) {
        console.error('Erro ao carregar candidatos:', error);
        toast.error('Não foi possível carregar a lista de candidatos');
      }
    };

    fetchCandidates();
  }, []);

  // Carregar dados do candidato selecionado
  const loadCandidateData = async (candidateId: string) => {
    if (!candidateId) return;
    
    setLoading(true);
    setCandidateData(null);
    setCandidateResponses(null);
    setCandidateResults(null);
    setCandidatePerformance(null);

    try {
      // Carregar dados básicos do candidato
      const candidateResponse = await fetch(`/api/admin/candidates/${candidateId}`, {
        credentials: 'include'
      });

      if (!candidateResponse.ok) {
        throw new Error('Erro ao carregar dados do candidato');
      }

      const candidateData = await candidateResponse.json();
      setCandidateData(candidateData);

      // Carregar respostas do candidato
      const responsesResponse = await fetch(`/api/admin/candidates/${candidateId}/responses`, {
        credentials: 'include'
      });

      if (responsesResponse.ok) {
        const responsesData = await responsesResponse.json();
        setCandidateResponses(responsesData);
      }

      // Carregar resultados do candidato
      const resultsResponse = await fetch(`/api/admin/candidates/${candidateId}/results`, {
        credentials: 'include'
      });

      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        setCandidateResults(resultsData);
      }

      // Carregar desempenho do candidato
      const performanceResponse = await fetch(`/api/admin/candidates/${candidateId}/performance`, {
        credentials: 'include'
      });

      if (performanceResponse.ok) {
        const performanceData = await performanceResponse.json();
        setCandidatePerformance(performanceData);
      }

      // Se o candidato tiver um processo seletivo, carregar dados de personalidade do processo
      if (candidateData.processId) {
        const personalityResponse = await fetch(`/api/admin/processes/${candidateData.processId}/personality-data`);
        
        if (personalityResponse.ok) {
          const personalityData = await personalityResponse.json();
          // Adicionar dados de personalidade ao objeto de desempenho
          if (setCandidatePerformance) {
            setCandidatePerformance(prev => ({
              ...prev,
              processPersonalityData: personalityData
            }));
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Ocorreu um erro ao carregar os dados do candidato');
    } finally {
      setLoading(false);
    }
  };

  // Quando o candidato selecionado mudar, carregar seus dados
  useEffect(() => {
    if (selectedCandidateId) {
      loadCandidateData(selectedCandidateId);
    }
  }, [selectedCandidateId]);

  // Função para formatar JSON para exibição
  const formatJSON = (data: any) => {
    return JSON.stringify(data, null, 2);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-secondary-900 mb-6">Calculadora de Compatibilidade</h1>
        
        {/* Seletor de candidato */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Selecione um candidato:
          </label>
          <select
            className="w-full p-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={selectedCandidateId}
            onChange={(e) => setSelectedCandidateId(e.target.value)}
          >
            <option value="">Selecione um candidato</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name} ({candidate.email})
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-secondary-700">Carregando dados...</span>
          </div>
        ) : (
          <>
            {selectedCandidateId && (
              <div className="space-y-6">
                {/* Dados básicos do candidato */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-primary-600 text-white px-6 py-3">
                    <h2 className="text-lg font-medium">1. Dados Básicos do Candidato</h2>
                    <p className="text-sm opacity-80">Endpoint: /api/admin/candidates/{selectedCandidateId}</p>
                  </div>
                  <div className="p-6">
                    {candidateData ? (
                      <pre className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96 text-sm">
                        {formatJSON(candidateData)}
                      </pre>
                    ) : (
                      <p className="text-secondary-500 italic">Nenhum dado disponível</p>
                    )}
                  </div>
                </div>

                {/* Respostas do candidato */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-primary-600 text-white px-6 py-3">
                    <h2 className="text-lg font-medium">2. Respostas do Candidato</h2>
                    <p className="text-sm opacity-80">Endpoint: /api/admin/candidates/{selectedCandidateId}/responses</p>
                  </div>
                  <div className="p-6">
                    {candidateResponses ? (
                      <pre className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96 text-sm">
                        {formatJSON(candidateResponses)}
                      </pre>
                    ) : (
                      <p className="text-secondary-500 italic">Nenhuma resposta disponível</p>
                    )}
                  </div>
                </div>

                {/* Resultados do candidato */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-primary-600 text-white px-6 py-3">
                    <h2 className="text-lg font-medium">3. Resultados do Candidato</h2>
                    <p className="text-sm opacity-80">Endpoint: /api/admin/candidates/{selectedCandidateId}/results</p>
                  </div>
                  <div className="p-6">
                    {candidateResults ? (
                      <pre className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96 text-sm">
                        {formatJSON(candidateResults)}
                      </pre>
                    ) : (
                      <p className="text-secondary-500 italic">Nenhum resultado disponível</p>
                    )}
                  </div>
                </div>

                {/* Desempenho do candidato */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-primary-600 text-white px-6 py-3">
                    <h2 className="text-lg font-medium">4. Desempenho do Candidato</h2>
                    <p className="text-sm opacity-80">Endpoint: /api/admin/candidates/{selectedCandidateId}/performance</p>
                  </div>
                  <div className="p-6">
                    {candidatePerformance ? (
                      <pre className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96 text-sm">
                        {formatJSON(candidatePerformance)}
                      </pre>
                    ) : (
                      <p className="text-secondary-500 italic">Nenhum dado de desempenho disponível</p>
                    )}
                  </div>
                </div>

                {/* Dados de personalidade do processo (se disponível) */}
                {candidateData?.processId && candidatePerformance?.processPersonalityData && (
                  <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="bg-primary-600 text-white px-6 py-3">
                      <h2 className="text-lg font-medium">5. Dados de Personalidade do Processo</h2>
                      <p className="text-sm opacity-80">Endpoint: /api/admin/processes/{candidateData.processId}/personality-data</p>
                    </div>
                    <div className="p-6">
                      <pre className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96 text-sm">
                        {formatJSON(candidatePerformance.processPersonalityData)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
