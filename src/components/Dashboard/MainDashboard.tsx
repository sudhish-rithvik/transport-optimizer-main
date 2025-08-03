// src/components/Dashboard/MainDashboard.tsx
import React, { useState, useEffect } from 'react';
import { GTFSProcessor } from '../../services/dataProcessing';
import { DemandClustering } from '../../services/clustering';
import { HybridForecasting } from '../../services/forecasting';
import { NSGAIIOptimizer } from '../../services/optimization';

export const MainDashboard: React.FC = () => {
  const [gtfsData, setGtfsData] = useState<GTFSData | null>(null);
  const [clusterResults, setClusterResults] = useState<ClusterResult | null>(null);
  const [optimizedSchedules, setOptimizedSchedules] = useState<ParetoSolution[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (files: FileList) => {
    setIsProcessing(true);
    
    try {
      // Step 1: Process GTFS data
      const processor = new GTFSProcessor();
      const data = await processor.parseGTFSFiles(files);
      setGtfsData(data);
      
      // Step 2: Perform clustering
      const clustering = new DemandClustering();
      const clusters = await clustering.performKMeansClustering(
        data.demandData, 4
      );
      setClusterResults(clusters);
      
      // Step 3: Forecast demand
      const forecasting = new HybridForecasting();
      await forecasting.buildLSTMModel([10, 5]); // 10 time steps, 5 features
      // ... training logic
      
      // Step 4: Optimize schedules
      const optimizer = new NSGAIIOptimizer();
      const solutions = await optimizer.optimizeSchedules(
        data.routes,
        data.forecasts,
        data.constraints
      );
      setOptimizedSchedules(solutions);
      
    } catch (error) {
      console.error('Processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">
          AI-Based Public Transport Optimizer
        </h1>
        
        {/* File Upload Section */}
        <FileUploadComponent onUpload={handleFileUpload} />
        
        {/* Processing Status */}
        {isProcessing && <ProcessingIndicator />}
        
        {/* Results Visualization */}
        {gtfsData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <ClusterVisualization data={clusterResults} />
            <ScheduleComparison 
              original={gtfsData.originalSchedules}
              optimized={optimizedSchedules}
            />
          </div>
        )}
        
        {/* Export Section */}
        {optimizedSchedules.length > 0 && (
          <ExportSection schedules={optimizedSchedules} />
        )}
      </div>
    </div>
  );
};
