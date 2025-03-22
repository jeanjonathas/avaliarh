import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

// Registrar os componentes do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

interface CompletionData {
  courseId: string;
  courseName: string;
  completionRate: number;
}

interface CompletionRateChartProps {
  completionData: CompletionData[];
  loading?: boolean;
}

const CompletionRateChart: React.FC<CompletionRateChartProps> = ({ completionData, loading = false }) => {
  // Preparar dados para o gráfico
  const chartData = {
    labels: completionData.map(course => course.courseName),
    datasets: [
      {
        data: completionData.map(course => course.completionRate),
        backgroundColor: [
          '#3B82F6', // primary-500
          '#10B981', // green-500
          '#F59E0B', // yellow-500
          '#EF4444', // red-500
          '#8B5CF6', // purple-500
          '#EC4899', // pink-500
          '#06B6D4', // cyan-500
          '#14B8A6', // teal-500
        ],
        borderColor: [
          '#FFFFFF',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Opções do gráfico
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.label}: ${context.raw}%`;
          }
        }
      }
    },
    cutout: '70%',
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-secondary-200">
        <h3 className="text-lg font-semibold text-secondary-700">Taxa de Conclusão por Curso</h3>
      </div>
      
      {loading ? (
        <div className="p-6 flex justify-center items-center" style={{ height: '300px' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : completionData.length === 0 ? (
        <div className="p-6 flex flex-col items-center justify-center" style={{ height: '300px' }}>
          <ArrowTrendingUpIcon className="h-12 w-12 text-secondary-400 mb-4" />
          <p className="text-secondary-500 text-center">
            Não há dados de conclusão disponíveis no momento.<br />
            Os dados serão exibidos quando os alunos começarem a concluir os cursos.
          </p>
        </div>
      ) : (
        <div className="p-6" style={{ height: '300px' }}>
          <Doughnut data={chartData} options={chartOptions} />
        </div>
      )}
    </div>
  );
};

export default CompletionRateChart;
