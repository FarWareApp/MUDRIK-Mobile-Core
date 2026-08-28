import {
  ConnectivitySnapshot,
} from './Connectivity';

export interface ConnectivityService {
  getCurrent():
    Promise<ConnectivitySnapshot>;

  subscribe(
    listener: (
      snapshot:
        ConnectivitySnapshot,
    ) => void,
  ): () => void;
}
