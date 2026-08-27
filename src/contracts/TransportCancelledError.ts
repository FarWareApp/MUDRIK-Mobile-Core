export class TransportCancelledError extends Error {
  constructor() {
    super('Transport request cancelled');
    this.name = 'TransportCancelledError';
  }
}
