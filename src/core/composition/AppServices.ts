import { MessageTransport } from '../../contracts/MessageTransport';
import { MockMessageTransport } from '../../mocks/MockMessageTransport';

export type AppServices = {
  messageTransport: MessageTransport;
};

export const appServices: AppServices = {
  messageTransport: new MockMessageTransport(),
};
