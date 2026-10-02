const PRODUCTION_CHAT_ENDPOINT =
  'https://mudrik-intelligence-gateway-production.up.railway.app/v1/chat';

export const
MUDRIK_GATEWAY_CHAT_ENDPOINT =
  PRODUCTION_CHAT_ENDPOINT;

export function validateGatewayEndpoint(
  value: unknown,
): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    const url =
      new URL(value);

    return (
      url.protocol === 'https:'
      && url.username === ''
      && url.password === ''
      && url.search === ''
      && url.hash === ''
      && url.pathname === '/v1/chat'
    );
  } catch {
    return false;
  }
}
