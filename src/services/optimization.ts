// src/services/optimization.ts
export class NSGAIIOptimizer {
  async optimizeSchedules(
    routes: Route[],
    demandForecasts: DemandForecast[],
    constraints: OptimizationConstraints
  ): Promise<ParetoSolution[]> {
    
    const populationSize = 100;
    const generations = 50;
    
    // Initialize population
    let population = this.initializePopulation(populationSize, routes);
    
    for (let gen = 0; gen < generations; gen++) {
      // Evaluate objectives for each individual
      const evaluatedPop = population.map(individual => ({
        ...individual,
        objectives: this.evaluateObjectives(individual, demandForecasts)
      }));
      
      // Non-dominated sorting
      const fronts = this.nonDominatedSort(evaluatedPop);
      
      // Selection for next generation
      population = this.selectNextGeneration(
        fronts, 
        populationSize
      );
      
      // Crossover and mutation
      population = this.applyGeneticOperators(population);
      
      console.log(`Generation ${gen}: Best solutions found`);
    }
    
    return this.extractParetoFront(population);
  }
  
  private evaluateObjectives(
    individual: ScheduleIndividual, 
    forecasts: DemandForecast[]
  ): Objectives {
    return {
      operatorCost: this.calculateOperatorCost(individual),
      passengerWaitTime: this.calculateWaitTime(individual, forecasts),
      vehicleUtilization: this.calculateUtilization(individual)
    };
  }
  
  private nonDominatedSort(population: Individual[]): Individual[][] {
    const fronts: Individual[][] = [[]];
    
    population.forEach(p => {
      p.dominationCount = 0;
      p.dominatedSolutions = [];
      
      population.forEach(q => {
        if (this.dominates(p, q)) {
          p.dominatedSolutions.push(q);
        } else if (this.dominates(q, p)) {
          p.dominationCount++;
        }
      });
      
      if (p.dominationCount === 0) {
        fronts[0].push(p);
      }
    });
    
    let i = 0;
    while (fronts[i].length > 0) {
      const nextFront: Individual[] = [];
      
      fronts[i].forEach(p => {
        p.dominatedSolutions.forEach(q => {
          q.dominationCount--;
          if (q.dominationCount === 0) {
            nextFront.push(q);
          }
        });
      });
      
      i++;
      fronts[i] = nextFront;
    }
    
    return fronts.filter(front => front.length > 0);
  }
}
