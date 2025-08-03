// src/services/demandSimulation.ts
export class DemandSimulator {
  generatePassengerDemand(
    stops: Stop[], 
    timeWindows: TimeWindow[]
  ): PassengerDemand[] {
    return stops.flatMap(stop => 
      timeWindows.map(window => ({
        stopId: stop.id,
        timeWindow: window,
        passengerCount: this.simulateCount(stop, window),
        dayOfWeek: window.dayOfWeek
      }))
    );
  }
  
  private simulateCount(stop: Stop, window: TimeWindow): number {
    // Peak hour logic: higher demand 7-9 AM, 5-7 PM
    const hour = window.hour;
    const baseCount = Math.random() * 20;
    
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return Math.floor(baseCount * 2.5); // Peak multiplier
    }
    return Math.floor(baseCount);
  }
}
