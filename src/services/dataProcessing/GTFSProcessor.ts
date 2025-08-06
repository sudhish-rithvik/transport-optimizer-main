import Papa from 'papaparse';
import { GTFSData, PassengerDemand } from '../../types';

export class GTFSProcessor {
  async parseGTFSFiles(files: FileList): Promise<GTFSData> {
    const gtfsData: Partial<GTFSData> = {};
    
    for (const file of Array.from(files)) {
      const text = await file.text();
      const parsed = Papa.parse(text, { 
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim()
      });
      
      switch (file.name.toLowerCase()) {
        case 'routes.txt':
          gtfsData.routes = parsed.data as any[];
          break;
        case 'stops.txt':
          gtfsData.stops = parsed.data.map((stop: any) => ({
            ...stop,
            stop_lat: parseFloat(stop.stop_lat),
            stop_lon: parseFloat(stop.stop_lon)
          }));
          break;
        case 'trips.txt':
          gtfsData.trips = parsed.data as any[];
          break;
        case 'stop_times.txt':
          gtfsData.stopTimes = parsed.data as any[];
          break;
        case 'calendar.txt':
          gtfsData.calendar = parsed.data as any[];
          break;
      }
    }
    
    // Generate demand data if not provided
    if (!gtfsData.demandData && gtfsData.stops) {
      gtfsData.demandData = this.generateDemandData(gtfsData.stops);
    }
    
    return gtfsData as GTFSData;
  }
  
  private generateDemandData(stops: any[]): PassengerDemand[] {
    const timeWindows = ['06:00', '07:00', '08:00', '09:00', '17:00', '18:00', '19:00'];
    const demands: PassengerDemand[] = [];
    
    stops.forEach(stop => {
      timeWindows.forEach(time => {
        for (let day = 1; day <= 7; day++) {
          const baseCount = Math.random() * 50;
          // Peak hours (7-9 AM, 5-7 PM) get higher demand
          const isPeak = (time === '07:00' || time === '08:00' || time === '17:00' || time === '18:00');
          const multiplier = isPeak ? 2.5 : 1;
          
          demands.push({
            stop_id: stop.stop_id,
            time_window: time,
            passenger_count: Math.floor(baseCount * multiplier),
            day_of_week: day
          });
        }
      });
    });
    
    return demands;
  }
}
