export type SensorStopResult = Readonly<{
  confirmed: boolean;
  stoppedSensorIds: readonly string[];
  failedSensorIds: readonly string[];
}>;

export interface SensorObservationController {
  stopPassiveVisualObservation(): Promise<SensorStopResult>;
  stopAllPassiveObservation(): Promise<SensorStopResult>;
}
