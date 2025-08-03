// src/services/forecasting.ts
import * as tf from '@tensorflow/tfjs';

export class HybridForecasting {
  private lstmModel: tf.LayersModel | null = null;
  
  async buildLSTMModel(inputShape: number[]): Promise<void> {
    this.lstmModel = tf.sequential({
      layers: [
        tf.layers.lstm({
          units: 64,
          returnSequences: true,
          inputShape: [inputShape[0], inputShape[1]]
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
  }
  
  async trainLSTM(
    trainX: tf.Tensor, 
    trainY: tf.Tensor, 
    epochs: number = 50
  ): Promise<void> {
    if (!this.lstmModel) throw new Error('Model not built');
    
    await this.lstmModel.fit(trainX, trainY, {
      epochs,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch}: loss = ${logs?.loss}`);
        }
      }
    });
  }
  
  async predictDemand(inputData: tf.Tensor): Promise<number[]> {
    if (!this.lstmModel) throw new Error('Model not trained');
    
    const lstmPredictions = this.lstmModel.predict(inputData) as tf.Tensor;
    
    // Apply SVR refinement (simplified implementation)
    const refinedPredictions = this.applySVRRefinement(
      await lstmPredictions.data()
    );
    
    lstmPredictions.dispose();
    return refinedPredictions;
  }
  
  private applySVRRefinement(predictions: Float32Array): number[] {
    // Simplified SVR implementation
    // In practice, you'd implement or use a proper SVR library
    return Array.from(predictions).map(pred => 
      Math.max(0, pred + (Math.random() - 0.5) * 0.1)
    );
  }
}
