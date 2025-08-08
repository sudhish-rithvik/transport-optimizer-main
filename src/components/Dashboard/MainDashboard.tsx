import React, { useState, useCallback } from 'react';
import { Upload, Play, Download, BarChart3 } from 'lucide-react';
import { GTFSProcessor } from '../../services/dataProcessing/GTFSProcessor';
import { DemandClustering } from '../../services/ai/clustering/KMeansClustering';
import { HybridForecasting } from '../../services/ai/forecasting/HybridForecasting';
import { NSGAIIOptimizer } from '../../services/ai/optimization/NSGAIIOptimizer';
import { GTFSData, ClusterResult, OptimizedSchedule } from '../../types';

export const MainDashboard: React.FC = () => {
  const [gtfsData, setGtfsData] = useState<GTFSData | null>(null);
  const [clusterResults, setClusterResults] = useState<ClusterResult | null>(null);
  const [optimizedSchedules, setOptimizedSchedules] = useState<OptimizedSchedule[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setProgress('Processing GTFS files...');

    try {
      // Step 1: Process GTFS data
      const processor = new GTFSProcessor();
      const data = await processor.parseGTFSFiles(files);
      setGtfsData(data);
      setProgress('GTFS data loaded successfully!');

      // Step 2: Perform clustering
      setProgress('Analyzing demand patterns with K-Means clustering...');
      const clustering = new DemandClustering();
      const clusters = await clustering.performKMeansClustering(data.demandData || [], 4);
      setClusterResults(clusters);
      setProgress('Demand clustering completed!');

      // Step 3: Train forecasting model
      setProgress('Training LSTM-SVR forecasting model...');
      const forecasting = new HybridForecasting();
      await forecasting.buildAndTrainModel(data.demandData || []);
      await forecasting.saveModel();
      setProgress('Forecasting model trained and saved!');

      // Step 4: Optimize schedules
      setProgress('Optimizing schedules with NSGA-II...');
      const optimizer = new NSGAIIOptimizer();
      const solutions = await optimizer.optimizeSchedules(data, data.demandData || []);
      setOptimizedSchedules(solutions);
      setProgress('Schedule optimization completed!');

    } catch (error) {
      console.error('Processing error:', error);
      setProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const downloadOptimizedSchedules = useCallback(() => {
    if (optimizedSchedules.length === 0) return;

    const csvContent = [
      'Route ID,Optimized Times,Wait Time Reduction (%),Utilization Increase (%),Cost Savings (%)',
      ...optimizedSchedules.map(schedule => 
        `${schedule.route_id},"${schedule.optimized_times.join(';')}",${schedule.performance_metrics.wait_time_reduction},${schedule.performance_metrics.utilization_increase},${schedule.performance_metrics.cost_savings}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'optimized_schedules.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, [optimizedSchedules]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            AI-Based Public Transport Optimizer
          </h1>
          <p className="text-gray-600">
            Offline-capable optimization for small towns using K-Means, LSTM-SVR, and NSGA-II
          </p>
        </header>

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <Upload className="mr-2" />
            Upload GTFS Data
          </h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              multiple
              accept=".txt,.csv"
              onChange={handleFileUpload}
              className="hidden"
              id="gtfs-upload"
              disabled={isProcessing}
            />
            <label
              htmlFor="gtfs-upload"
              className={`cursor-pointer inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white ${
                isProcessing ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Upload className="mr-2" />
              {isProcessing ? 'Processing...' : 'Choose GTFS Files'}
            </label>
            <p className="mt-2 text-sm text-gray-500">
              Upload routes.txt, stops.txt, trips.txt, stop_times.txt, and calendar.txt
            </p>
          </div>
        </div>

        {/* Progress Section */}
        {isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800">{progress}</span>
            </div>
          </div>
        )}

        {/* Results Section */}
        {gtfsData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Data Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <BarChart3 className="mr-2" />
                Data Summary
              </h3>
              <div className="space-y-2">
                <p><strong>Routes:</strong> {gtfsData.routes.length}</p>
                <p><strong>Stops:</strong> {gtfsData.stops.length}</p>
                <p><strong>Trips:</strong> {gtfsData.trips.length}</p>
                <p><strong>Demand Data Points:</strong> {gtfsData.demandData?.length || 0}</p>
              </div>
            </div>

            {/* Clustering Results */}
            {clusterResults && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-4">Clustering Results</h3>
                <div className="space-y-2">
                  <p><strong>Number of Clusters:</strong> {clusterResults.clusters.length}</p>
                  {clusterResults.clusters.map((cluster, index) => (
                    <p key={index}>
                      <strong>Cluster {index + 1}:</strong> {cluster.length} data points
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Optimized Schedules */}
        {optimizedSchedules.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Optimized Schedules</h3>
              <button
                onClick={downloadOptimizedSchedules}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Results
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wait Time Reduction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilization Increase
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost Savings
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {optimizedSchedules.map((schedule, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {schedule.route_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {schedule.performance_metrics.wait_time_reduction}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {schedule.performance_metrics.utilization_increase}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {schedule.performance_metrics.cost_savings}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainDashboard;
