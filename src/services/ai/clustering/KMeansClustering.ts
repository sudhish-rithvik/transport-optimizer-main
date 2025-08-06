import * as tf from '@tensorflow/tfjs';
import { PassengerDemand, ClusterResult } from '../../../types';

export class DemandClustering {
  async performKMeansClustering(
    demandData: PassengerDemand[], 
    k: number = 4
  ): Promise<ClusterResult> {
    // Prepare features: [hour, day_of_week, passenger_count, stop_lat, stop_lon]
    const features = demandData.map(d => [
      this.timeToHour(d.time_window),
      d.day_of_week,
      d.passenger_count,
      // Add stop coordinates if available
      0, 0 // Placeholder for lat/lon
    ]);
    
    const data = tf.tensor2d(features);
    
    // Initialize centroids randomly
    const [numSamples, numFeatures] = data.shape;
    let centroids = tf.randomUniform([k, numFeatures], 0, 1);
    
    let prevAssignments = tf.zeros([numSamples]);
    let assignments = tf.zeros([numSamples]);
    
    // K-means iterations
    for (let iter = 0; iter < 100; iter++) {
      // Calculate distances to centroids
      const expandedData = data.expandDims(1); // [numSamples, 1, numFeatures]
      const expandedCentroids = centroids.expandDims(0); // [1, k, numFeatures]
      
      const distances = tf.sum(
        tf.square(tf.sub(expandedData, expandedCentroids)), 
        2
      ); // [numSamples, k]
      
      // Assign to closest centroid
      prevAssignments.dispose();
      prevAssignments = assignments;
      assignments = tf.argMin(distances, 1);
      
      // Check for convergence
      const hasChanged = !tf.equal(prevAssignments, assignments).all().dataSync()[0];
      
      if (!hasChanged) {
        console.log(`K-means converged after ${iter} iterations`);
        break;
      }
      
      // Update centroids
      const newCentroids = [];
      for (let i = 0; i < k; i++) {
        const mask = tf.equal(assignments, i);
        const clusterPoints = tf.boolean_mask(data, mask);
        
        if (clusterPoints.shape[0] > 0) {
          const newCentroid = tf.mean(clusterPoints, 0);
          newCentroids.push(newCentroid);
        } else {
          // Keep old centroid if no points assigned
          newCentroids.push(centroids.slice([i, 0], [1, numFeatures]).reshape([numFeatures]));
        }
      }
      
      centroids.dispose();
      centroids = tf.stack(newCentroids);
    }
    
    const assignmentData = await assignments.data();
    const centroidData = await centroids.data();
    
    // Group data by clusters
    const clusters: PassengerDemand[][] = Array(k).fill(null).map(() => []);
    assignmentData.forEach((clusterIdx, dataIdx) => {
      clusters[clusterIdx].push(demandData[dataIdx]);
    });
    
    // Cleanup tensors
    data.dispose();
    centroids.dispose();
    assignments.dispose();
    prevAssignments.dispose();
    
    return {
      assignments: Array.from(assignmentData),
      centroids: this.reshapeCentroids(Array.from(centroidData), k, features[0].length),
      clusters
    };
  }
  
  private timeToHour(timeStr: string): number {
    const hour = parseInt(timeStr.split(':')[0]);
    return hour;
  }
  
  private reshapeCentroids(flatData: number[], k: number, numFeatures: number): number[][] {
    const centroids: number[][] = [];
    for (let i = 0; i < k; i++) {
      centroids.push(flatData.slice(i * numFeatures, (i + 1) * numFeatures));
    }
    return centroids;
  }
}
