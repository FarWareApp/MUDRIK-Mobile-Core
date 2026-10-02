export class GatewaySessionUnavailableError
extends Error {
  constructor() {
    super(
      'MUDRIK gateway session unavailable',
    );
    this.name =
      'GatewaySessionUnavailableError';
  }
}

function validToken(
  token: string,
): boolean {
  return (
    typeof token === 'string'
    && token.length >= 32
    && token.length <= 4096
    && !/[\r\n]/.test(token)
  );
}

export type GatewaySessionSnapshot =
  Readonly<{
    available: boolean;
    generation: number;
  }>;

export class VolatileGatewaySessionTokenStore {
  private token: string | null = null;

  private generation = 0;

  set(
    token: string,
  ): GatewaySessionSnapshot {
    if (!validToken(token)) {
      throw new TypeError(
        'Invalid gateway session token',
      );
    }

    this.token = token;
    this.generation += 1;

    return this.snapshot();
  }

  clear(): GatewaySessionSnapshot {
    this.token = null;
    this.generation += 1;

    return this.snapshot();
  }

  async getAccessToken():
    Promise<string> {
    if (!this.token) {
      throw new
        GatewaySessionUnavailableError();
    }

    return this.token;
  }

  snapshot():
    GatewaySessionSnapshot {
    return Object.freeze({
      available:
        this.token !== null,
      generation:
        this.generation,
    });
  }

  toJSON():
    GatewaySessionSnapshot {
    return this.snapshot();
  }
}
