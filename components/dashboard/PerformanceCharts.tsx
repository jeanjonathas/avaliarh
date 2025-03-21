import React from 'react';
import { Bar, Pie, Line, Radar, Doughnut } from 'react-chartjs-2';

interface PerformanceChartsProps {
  categorySuccessData: any;
  categorySuccessOptions: any;
  realVsExpectedData: any;
  realVsExpectedOptions: any;
  overallPerformanceData: any;
  overallPerformanceOptions: any;
  trendData?: any;
  trendOptions?: any;
}

const PerformanceCharts: React.FC<PerformanceChartsProps> = ({
  categorySuccessData,
  categorySuccessOptions,
  realVsExpectedData,
  realVsExpectedOptions,
  overallPerformanceData,
  overallPerformanceOptions,
  trendData,
  trendOptions
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-secondary-700 mb-4">Taxa de Sucesso por Categoria</h3>
          <div className="h-80">
            <Bar 
              data={categorySuccessData}
              options={categorySuccessOptions}
            />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-secondary-700 mb-4">Taxa Real vs Esperada</h3>
          <div className="h-80">
            <Bar 
              data={realVsExpectedData}
              options={realVsExpectedOptions}
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-secondary-700 mb-4">Desempenho Geral</h3>
          <div className="h-80">
            <Doughnut 
              data={overallPerformanceData}
              options={overallPerformanceOptions}
            />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-secondary-700 mb-4">Tendências de Aprovação</h3>
          <div className="h-80">
            {trendData && (
              <Line 
                data={trendData}
                options={trendOptions}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceCharts;
