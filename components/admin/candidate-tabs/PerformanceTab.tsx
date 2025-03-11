import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ChartOptions,
  ChartData,
  ArcElement,
  DoughnutController
} from 'chart.js';
import { Radar, Bar, Doughnut } from 'react-chartjs-2';

// Registrar os componentes do Chart.js
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  DoughnutController
);

interface StageScore {
  id: string;
  name: string;
  percentage: number;
  correct: number;
  total: number;
}

interface Candidate {
  id: string;
  name: string;
  score?: number;
  stageScores?: StageScore[];
}

interface PerformanceTabProps {
  candidate: Candidate;
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({ candidate }) => {
  const [radarData, setRadarData] = useState<ChartData<'radar'>>({
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
  });

  const [barData, setBarData] = useState<ChartData<'bar'>>({
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
  });

  const [doughnutData, setDoughnutData] = useState<ChartData<'doughnut'>>({
    labels: ['Corretas', 'Incorretas'],
    datasets: [
      {
        data: [0, 0],
        backgroundColor: [
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 99, 132, 0.7)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1,
      }
    ]
  });

  // Opções para o gráfico de radar
  const radarOptions: ChartOptions<'radar'> = {
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
        position: 'top',
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
  };

  // Opções para o gráfico de barras
  const [barOptions, setBarOptions] = useState<ChartOptions<'bar'>>({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        ticks: {
          stepSize: 1,
          callback: function(value: number | string) {
            if (typeof value === 'number' && Math.floor(value) === value) {
              return value;
            }
            return '';
          }
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
        position: 'top',
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
  });

  // Opções para o gráfico de rosca
  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
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
            const value = context.raw as number;
            const total = (context.dataset.data as number[]).reduce((a, b) => Number(a) + Number(b), 0);
            const percentage = Math.round((value / total) * 100);
            return `${context.label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
  };

  // Efeito para processar os dados do candidato quando eles são carregados
  useEffect(() => {
    if (candidate && candidate.stageScores && candidate.stageScores.length > 0) {
      console.log('Dados de desempenho recebidos:', candidate.stageScores);
      
      // Verificar se há etapas com dados
      if (candidate.stageScores.some(stage => stage.total === 0)) {
        console.warn('Atenção: Existem etapas sem respostas registradas');
      }
      
      // Ordenar as etapas para garantir consistência na visualização
      const sortedStages = [...candidate.stageScores].sort((a, b) => a.name.localeCompare(b.name));
      console.log('Etapas ordenadas:', sortedStages);
      
      // Atualizar os dados dos gráficos
      const stageLabels = sortedStages.map(score => score.name);
      const stagePercentages = sortedStages.map(score => score.percentage);
      const stageCorrect = sortedStages.map(score => score.correct);
      const stageTotal = sortedStages.map(score => score.total);
      
      console.log('Labels das etapas:', stageLabels);
      console.log('Percentuais:', stagePercentages);
      console.log('Acertos:', stageCorrect);
      console.log('Totais:', stageTotal);
      
      // Configurar dados do radar
      setRadarData({
        labels: stageLabels,
        datasets: [
          {
            label: 'Desempenho do Candidato',
            data: stagePercentages,
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
      
      // Configurar dados do gráfico de barras
      setBarData({
        labels: stageLabels,
        datasets: [
          {
            label: 'Acertos',
            data: stageCorrect,
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.7,
          },
          {
            label: 'Total',
            data: stageTotal,
            backgroundColor: 'rgba(200, 200, 200, 0.7)',
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.7,
          }
        ]
      });

      // Calcular totais para o gráfico de rosca
      const totalCorrect = sortedStages.reduce((sum, stage) => sum + stage.correct, 0);
      const totalQuestions = sortedStages.reduce((sum, stage) => sum + stage.total, 0);
      const totalIncorrect = totalQuestions - totalCorrect;

      console.log(`Total de questões: ${totalQuestions}, Total de acertos: ${totalCorrect}`);

      // Configurar dados do gráfico de rosca
      setDoughnutData({
        labels: ['Corretas', 'Incorretas'],
        datasets: [
          {
            data: [totalCorrect, totalIncorrect],
            backgroundColor: [
              'rgba(75, 192, 192, 0.7)',
              'rgba(255, 99, 132, 0.7)'
            ],
            borderColor: [
              'rgba(75, 192, 192, 1)',
              'rgba(255, 99, 132, 1)'
            ],
            borderWidth: 1,
          }
        ]
      });

      // Atualizar a escala Y do gráfico de barras com base no maior número de questões
      const maxQuestions = Math.max(...stageTotal);
      console.log(`Máximo de questões por etapa: ${maxQuestions}`);
      
      setBarOptions(prevOptions => ({
        ...prevOptions,
        scales: {
          ...prevOptions.scales,
          y: {
            ...prevOptions.scales?.y,
            max: Math.max(maxQuestions, 10),
            ticks: {
              stepSize: 1,
              callback: function(value: number | string) {
                if (typeof value === 'number' && Math.floor(value) === value) {
                  return value;
                }
                return '';
              }
            }
          }
        }
      }));
    }
  }, [candidate]);

  // Função para renderizar os cards de resumo
  const renderSummaryCards = () => {
    if (!candidate?.stageScores || candidate.stageScores.length === 0) return null;

    const totalCorrect = candidate.stageScores.reduce((sum, stage) => sum + stage.correct, 0);
    const totalQuestions = candidate.stageScores.reduce((sum, stage) => sum + stage.total, 0);
    const overallPercentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h4 className="text-sm font-medium text-secondary-500 mb-1">Pontuação Geral</h4>
          <div className="flex items-end">
            <span className="text-3xl font-bold text-secondary-900">{overallPercentage}%</span>
            <span className="text-sm text-secondary-500 ml-2 mb-1">de acertos</span>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h4 className="text-sm font-medium text-secondary-500 mb-1">Questões Respondidas</h4>
          <div className="flex items-end">
            <span className="text-3xl font-bold text-secondary-900">{totalQuestions}</span>
            <span className="text-sm text-secondary-500 ml-2 mb-1">questões</span>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h4 className="text-sm font-medium text-secondary-500 mb-1">Etapas Completadas</h4>
          <div className="flex items-end">
            <span className="text-3xl font-bold text-secondary-900">{candidate.stageScores.length}</span>
            <span className="text-sm text-secondary-500 ml-2 mb-1">etapas</span>
          </div>
        </div>
      </div>
    );
  };

  // Função para renderizar a tabela de desempenho por etapa
  const renderPerformanceTable = () => {
    if (!candidate?.stageScores || candidate.stageScores.length === 0) return null;
    
    const sortedStages = [...candidate.stageScores].sort((a, b) => a.name.localeCompare(b.name));
    
    return (
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4">Detalhamento por Etapa</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead className="bg-secondary-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Etapa
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Acertos
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Total
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Percentual
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {sortedStages.map((stage) => (
                <tr key={stage.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                    {stage.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                    {stage.correct}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                    {stage.total}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-full bg-secondary-200 rounded-full h-2.5 mr-2 max-w-[100px]">
                        <div 
                          className={`h-2.5 rounded-full ${
                            stage.percentage >= 70 ? 'bg-green-500' : 
                            stage.percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} 
                          style={{ width: `${stage.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-secondary-900">{stage.percentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {candidate?.stageScores && candidate.stageScores.length > 0 ? (
        <>
          {/* Cards de Resumo */}
          {renderSummaryCards()}
          
          {/* Gráfico de Rosca - Visão Geral */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-secondary-800 mb-4">Visão Geral</h3>
              <div className="h-64">
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
            </div>
            
            {/* Gráfico de Radar - Desempenho por Etapa */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-secondary-800 mb-4">Desempenho por Etapa</h3>
              <div className="h-64">
                <Radar data={radarData} options={radarOptions} />
              </div>
            </div>
          </div>

          {/* Tabela de Desempenho por Etapa */}
          {renderPerformanceTable()}
          
          {/* Gráfico de Barras - Acertos vs Total */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-secondary-800 mb-4">Acertos por Etapa</h3>
            <div className="h-80">
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-center h-64">
          <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-secondary-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-secondary-500 text-lg">Não há dados de desempenho disponíveis para este candidato.</p>
            <p className="text-secondary-400 mt-2">O candidato precisa completar pelo menos uma etapa do teste.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceTab;
