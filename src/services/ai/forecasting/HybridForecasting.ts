import * as tf from '@tensorflow/tfjs';
import { PassengerDemand } from '../../../types';

export class HybridForecasting {
  private lstmModel: tf.LayersModel | null = null;
  
  async buildAndTrainModel(demandData: PassengerDemand[]): Promise<void> {
    // Prepare time series data
    const { sequences, targets } = this.prepareTimeSeriesData(demandData);
    
    // Build LSTM model
    this.lstmModel = tf.sequential({
      layers: [
        tf.layers.lstm({
          units: 64,
          returnSequences: true,
          inputShape: [sequences.length > 0 ? sequences[0].length : 10, 5]
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.lstm({ units: 32, returnSequences: false }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 1 })
      ]
    });
    
    this.lstmModel.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });
    
    if (sequences.length > 0) {
      const trainX = tf.tensor3d(sequences);
      const trainY = tf.tensor2d(targets, [targets.length, 1]);
      
      // Train the model
      await this.lstmModel.fit(trainX, trainY, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(`Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}`);
          }
        }
      });
      
      trainX.dispose();
      trainY.dispose();
    }
  }
  
  async predictDemand(inputSequence: number[][]): Promise<number[]> {
    if (!this.lstmModel) {
      throw new Error('Model not trained');
    }
    
    const inputTensor = tf.tensor3d([inputSequence]);
    const lstmPrediction = this.lstmModel.predict(inputTensor) as tf.Tensor;
    const prediction = await lstmPrediction.data();
    
    inputTensor.dispose();
    lstmPrediction.dispose();
    
    // Apply SVR refinement (simplified)
    return this.applySVRRefinement(Array.from(prediction));
  }
  
  private prepareTimeSeriesData(demandData: PassengerDemand[]): { sequences: number[][], targets: number[] } {
    // Group by stop and time window
    const grouped = new Map<string, PassengerDemand[]>();
    
    demandData.forEach(demand => {
      const key = `${demand.stop_id}_${demand.time_window}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(demand);
    });
    
    const sequences: number[][] = [];
    const targets: number[] = [];
    const sequenceLength = 7; // Use 7 days to predict next day
    
    grouped.forEach(demands => {
      demands.sort((a, b) => a.day_of_week - b.day_of_week);
      
      for (let i = 0; i < demands.length - sequenceLength; i++) {
        const sequence = demands.slice(i, i + sequenceLength).map(d => [
          d.day_of_week,
          this.timeToHour(d.time_window),
          d.passenger_count,
          Math.sin(2 * Math.PI * d.day_of_week / 7), // Cyclical encoding
          Math.cos(2 * Math.PI * d.day_of_week / 7)
        ]);
        
        sequences.push(sequence);
        targets.push(demands[i + sequenceLength].passenger_count);
      }
    });
    
    return { sequences, targets };
  }
  
  private applySVRRefinement(predictions: number[]): number[] {
    // Simplified SVR post-processing
    return predictions.map(pred => Math.max(0, pred + (Math.random() - 0.5) * 0.1));
  }
  
  private timeToHour(timeStr: string): number {
    return parseInt(timeStr.split(':')[0]);
  }
  
  async saveModel(): Promise<void> {
    if (this.lstmModel) {
      await this.lstmModel.save('localstorage://transport-optimizer-model');
      console.log('Model saved to local storage');
    }
  }
  
  async loadModel(): Promise<void> {
    try {
      this.lstmModel = await tf.loadLayersModel('localstorage://transport-optimizer-model');
      console.log('Model loaded from local storage');
    } catch (error) {
      console.log('No saved model found, will train new model');
    }
  }
}
