export interface GTFSData {
  routes: Route[];
  stops: Stop[];
  trips: Trip[];
  stopTimes: StopTime[];
  calendar: Calendar[];
  demandData?: PassengerDemand[];
}

export interface Route {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
}

export interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
}

export interface Trip {
  route_id: string;
  service_id: string;
  trip_id: string;
  trip_headsign: string;
}

export interface StopTime {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: number;
}

export interface PassengerDemand {
  stop_id: string;
  time_window: string;
  passenger_count: number;
  day_of_week: number;
}

export interface ClusterResult {
  assignments: number[];
  centroids: number[][];
  clusters: PassengerDemand[][];
}

export interface OptimizedSchedule {
  route_id: string;
  optimized_times: string[];
  performance_metrics: {
    wait_time_reduction: number;
    utilization_increase: number;
    cost_savings: number;
  };
}
