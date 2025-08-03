// src/services/clustering.ts
import * as tf from '@tensorflow/tfjs';

export class DemandClustering {
  async performKMeansClustering(
    demandData: PassengerDemand[], 
    k: number = 4
  ): Promise<ClusterResult> {
    // Prepare data for TensorFlow.js
    const features = this.prepareFeatures(demandData);
    const tensor = tf.tensor2d(features);
    
    // Initialize centroids randomly
    const centroids = tf.randomUniform([k, features[0].length]);
    
    let assignments = tf.zeros([features.length]);
    
    // K-means iterations
    for (let iter = 0; iter < 100; iter++) {
      // Calculate distances to centroids
      const expandedPoints = tensor.expandDims(1);
      const expandedCentroids = centroids.expandDims(0);
      
      const distances = tf.sum(
        tf.square(tf.sub(expandedPoints, expandedCentroids)), 
        2
      );
      
      // Assign to closest centroid
      const newAssignments = tf.argMin(distances, 1);
      
      // Check for convergence
      const hasChanged = !tf.equal(assignments, newAssignments).all();
      assignments.dispose();
      assignments = newAssignments;
      
      if (!hasChanged) break;
      
      // Update centroids
      this.updateCentroids(tensor, assignments, centroids, k);
    }
    
    return {
      assignments: await assignments.data(),
      centroids: await centroids.data(),
      clusters: this.groupByClusters(demandData, await assignments.data())
    };
  }
  
  private prepareFeatures(data: PassengerDemand[]): number[][] {
    return data.map(d => [
      d.timeWindow.hour,
      d.timeWindow.dayOfWeek,
      d.passengerCount,
      parseFloat(d.stop.lat || '0'),
      parseFloat(d.stop.lon || '0')
    ]);
  }
}
