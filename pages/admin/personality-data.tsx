import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { toast } from 'react-hot-toast';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Registrar os componentes necessários do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Definir tipos para os dados de personalidade
interface TraitData {
  name: string;
  weight: number;
}

interface GroupData {
  name: string;
  traits: TraitData[];
  expectedProfile: Record<string, number>;
}

interface PersonalityData {
  groups: GroupData[];
}

export default function PersonalityDataPage() {
  const router = useRouter();
  const [processId, setProcessId] = useState<string>('');
  const [personalityData, setPersonalityData] = useState<PersonalityData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [processes, setProcesses] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingProcesses, setLoadingProcesses] = useState<boolean>(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});

  // Carregar a lista de processos
  useEffect(() => {
    const fetchProcesses = async () => {
      try {
        const response = await fetch('/api/admin/processes');
        const data = await response.json();
        
        if (data && Array.isArray(data.processes)) {
          setProcesses(data.processes.map((process: any) => ({
            id: process.id,
            name: process.name
          })));
        }
      } catch (error) {
        console.error('Erro ao carregar processos:', error);
        toast.error('Erro ao carregar processos');
      } finally {
        setLoadingProcesses(false);
      }
    };

    fetchProcesses();
  }, []);

  // Carregar dados de personalidade quando o processId mudar
  useEffect(() => {
    if (!processId) return;

    const fetchPersonalityData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/processes/${processId}/personality-data`);
        const data = await response.json();
        
        if (data && data.groups) {
          setPersonalityData(data);
          // Inicializar o primeiro grupo como expandido
          if (data.groups.length > 0) {
            setExpandedGroups({ 0: true });
          }
        } else {
          setPersonalityData(null);
          toast.error('Não há dados de personalidade para este processo');
        }
      } catch (error) {
        console.error('Erro ao carregar dados de personalidade:', error);
        toast.error('Erro ao carregar dados');
        setPersonalityData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonalityData();
  }, [processId]);

  // Função para gerar dados do gráfico para um grupo
  const generateChartData = (group: GroupData) => {
    const labels = Object.keys(group.expectedProfile);
    const data = Object.values(group.expectedProfile);

    return {
      labels,
      datasets: [
        {
          label: 'Perfil Esperado (%)',
          data,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  // Opções para o gráfico
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Porcentagem (%)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Traços de Personalidade',
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Perfil Esperado por Traço',
      },
    },
  };

  // Manipulador de mudança de processo
  const handleProcessChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProcessId(e.target.value);
  };

  // Função para alternar a expansão de um grupo
  const toggleGroup = (index: number) => {
    setExpandedGroups(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">
          Dados de Personalidade do Processo
        </h1>

        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            Selecione um Processo
          </h2>
          
          {loadingProcesses ? (
            <div className="flex justify-center items-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-2">Carregando processos...</span>
            </div>
          ) : (
            <select 
              className="w-full p-2 border border-gray-300 rounded mb-4"
              value={processId} 
              onChange={handleProcessChange}
            >
              <option value="">Selecione um processo</option>
              {processes.map((process) => (
                <option key={process.id} value={process.id}>
                  {process.name}
                </option>
              ))}
            </select>
          )}

          {processId && (
            <button 
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
              onClick={() => router.push(`/admin/processes/${processId}`)}
            >
              Ver Detalhes do Processo
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-lg">Carregando dados de personalidade...</span>
          </div>
        ) : personalityData && personalityData.groups.length > 0 ? (
          <div className="space-y-4">
            {personalityData.groups.map((group, groupIndex) => (
              <div key={groupIndex} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div 
                  className="p-4 bg-gray-50 cursor-pointer flex justify-between items-center"
                  onClick={() => toggleGroup(groupIndex)}
                >
                  <h3 className="font-bold">
                    {group.name} ({group.traits.length} traços)
                  </h3>
                  <span className="text-xl">
                    {expandedGroups[groupIndex] ? '▼' : '▶'}
                  </span>
                </div>
                
                {expandedGroups[groupIndex] && (
                  <div className="p-4">
                    <div className="bg-white rounded-lg mb-4">
                      <h4 className="font-semibold p-3 border-b">Traços e Pesos</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="p-2 text-left border-b">Traço</th>
                              <th className="p-2 text-center border-b">Peso</th>
                              <th className="p-2 text-center border-b">Valor Esperado (%)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.traits.map((trait, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                <td className="p-2 border-b">{trait.name}</td>
                                <td className="p-2 text-center border-b">
                                  <span className={`inline-block px-2 py-1 rounded-full text-xs text-white ${
                                    trait.weight >= 4 ? 'bg-green-500' : 
                                    trait.weight >= 2 ? 'bg-blue-500' : 'bg-gray-500'
                                  }`}>
                                    {trait.weight}
                                  </span>
                                </td>
                                <td className="p-2 text-center border-b">
                                  {group.expectedProfile[trait.name]}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg">
                      <h4 className="font-semibold p-3 border-b">Gráfico de Perfil Esperado</h4>
                      <div className="p-4" style={{ height: '400px' }}>
                        <Bar data={generateChartData(group)} options={chartOptions} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : processId ? (
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-center text-lg text-gray-500">
              Nenhum dado de personalidade encontrado para este processo.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-center text-lg text-gray-500">
              Selecione um processo para visualizar seus dados de personalidade.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
