import React, { useState, useEffect } from 'react';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';

// Registrar os componentes necessários do Chart.js
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

// Definição de tipos
export interface PersonalityTrait {
  trait: string;
  percentage: number;
  count: number;
  groupId?: string;
  groupName?: string;
  weight?: number;
}

interface PersonalityGroup {
  id: string;
  name: string;
  traits: PersonalityTrait[];
  colorBg: string;
  colorBorder: string;
}

export interface PersonalityRadarChartProps {
  traits: PersonalityTrait[];
  height?: number;
  className?: string;
}

const CHART_COLORS = [
  { bg: 'rgba(255, 99, 132, 0.2)', border: 'rgb(255, 99, 132)' },
  { bg: 'rgba(54, 162, 235, 0.2)', border: 'rgb(54, 162, 235)' },
  { bg: 'rgba(255, 206, 86, 0.2)', border: 'rgb(255, 206, 86)' },
  { bg: 'rgba(75, 192, 192, 0.2)', border: 'rgb(75, 192, 192)' },
  { bg: 'rgba(153, 102, 255, 0.2)', border: 'rgb(153, 102, 255)' },
  { bg: 'rgba(255, 159, 64, 0.2)', border: 'rgb(255, 159, 64)' }
];

const PersonalityRadarChart: React.FC<PersonalityRadarChartProps> = ({
  traits,
  height = 300,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [chartData, setChartData] = useState<ChartData<'radar'> | null>(null);
  const [groups, setGroups] = useState<PersonalityGroup[]>([]);
  const [hasGroups, setHasGroups] = useState<boolean>(false);

  useEffect(() => {
    if (!traits || traits.length === 0) {
      return;
    }

    console.log('Processando dados para o gráfico de radar:', traits);

    // Verificar se os traços têm informações de grupo
    const hasGroupInfo = traits.some(trait => trait.groupId && trait.groupName);
    setHasGroups(hasGroupInfo);

    // Criar o dataset com todos os traços
    const allTraitsData: ChartData<'radar'> = {
      labels: traits.map(trait => trait.trait),
      datasets: [
        {
          label: 'Todos os Traços',
          data: traits.map(trait => trait.percentage),
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
          pointBackgroundColor: 'rgba(75, 192, 192, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(75, 192, 192, 1)',
        }
      ]
    };

    setChartData(allTraitsData);

    // Se houver informações de grupo, criar datasets por grupo
    if (hasGroupInfo) {
      const groupedTraits: Record<string, PersonalityTrait[]> = {};
      
      // Agrupar traços por ID de grupo
      traits.forEach(trait => {
        if (trait.groupId) {
          if (!groupedTraits[trait.groupId]) {
            groupedTraits[trait.groupId] = [];
          }
          groupedTraits[trait.groupId].push(trait);
        }
      });

      // Criar array de grupos
      const groupsArray: PersonalityGroup[] = Object.entries(groupedTraits).map(
        ([groupId, groupTraits], index) => {
          const colorIndex = index % CHART_COLORS.length;
          return {
            id: groupId,
            name: groupTraits[0]?.groupName || `Grupo ${index + 1}`,
            traits: groupTraits,
            colorBg: CHART_COLORS[colorIndex].bg,
            colorBorder: CHART_COLORS[colorIndex].border
          };
        }
      );

      setGroups(groupsArray);
    }
  }, [traits]);

  // Alternar entre os grupos
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    if (tabId === 'all') {
      // Mostrar todos os traços
      if (traits.length > 0) {
        setChartData({
          labels: traits.map(trait => trait.trait),
          datasets: [
            {
              label: 'Todos os Traços',
              data: traits.map(trait => trait.percentage),
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1,
              pointBackgroundColor: 'rgba(75, 192, 192, 1)',
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: 'rgba(75, 192, 192, 1)',
            }
          ]
        });
      }
    } else {
      // Mostrar traços do grupo selecionado
      const selectedGroup = groups.find(group => group.id === tabId);
      
      if (selectedGroup) {
        setChartData({
          labels: selectedGroup.traits.map(trait => trait.trait),
          datasets: [
            {
              label: selectedGroup.name,
              data: selectedGroup.traits.map(trait => trait.percentage),
              backgroundColor: selectedGroup.colorBg,
              borderColor: selectedGroup.colorBorder,
              borderWidth: 1,
              pointBackgroundColor: selectedGroup.colorBorder,
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: selectedGroup.colorBorder,
            }
          ]
        });
      }
    }
  };

  // Opções do gráfico
  const chartOptions: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: {
          display: true
        },
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: {
          stepSize: 20
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        display: true
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.raw}%`;
          }
        }
      }
    }
  };

  if (!traits || traits.length === 0) {
    return (
      <div className={`flex justify-center items-center ${className}`} style={{ height: `${height}px` }}>
        <p className="text-gray-500">Não há dados de personalidade disponíveis</p>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <h3 className="text-lg font-medium text-gray-700 mb-4">Perfil de Personalidade</h3>
      
      {/* Tabs para seleção de grupos */}
      {hasGroups && groups.length > 0 && (
        <div className="mb-4 border-b border-gray-200 flex overflow-x-auto">
          <button
            className={`px-3 py-2 text-sm font-medium ${
              activeTab === 'all'
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange('all')}
          >
            Todos os Traços
          </button>
          
          {groups.map((group) => (
            <button
              key={group.id}
              className={`px-3 py-2 text-sm font-medium whitespace-nowrap ${
                activeTab === group.id
                  ? 'text-blue-600 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => handleTabChange(group.id)}
            >
              {group.name}
            </button>
          ))}
        </div>
      )}
      
      {/* Gráfico de Radar */}
      <div style={{ height: `${height}px` }}>
        {chartData ? (
          <Radar data={chartData} options={chartOptions} />
        ) : (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">Carregando dados...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalityRadarChart;
