import { MessageTransport } from '../../contracts/MessageTransport';
import { ConversationRepository } from '../../contracts/ConversationRepository';
import { DraftRepository } from '../../contracts/DraftRepository';
import { MessageRepository } from '../../contracts/MessageRepository';
import { SQLiteDraftRepository } from '../../features/chat/storage/SQLiteDraftRepository';
import { SQLiteMessageRepository } from '../../features/chat/storage/SQLiteMessageRepository';
import { SQLiteConversationRepository } from '../../features/conversations/storage/SQLiteConversationRepository';
import { MockMessageTransport } from '../../mocks/MockMessageTransport';
import { getDatabase } from '../storage/Database';

export type AppServices = {
  messageTransport: MessageTransport;
  conversationRepository: ConversationRepository;
  messageRepository: MessageRepository;
  draftRepository: DraftRepository;
};

export const appServices: AppServices = {
  messageTransport: new MockMessageTransport(),

  conversationRepository:
    new SQLiteConversationRepository(getDatabase),

  messageRepository:
    new SQLiteMessageRepository(getDatabase),

  draftRepository:
    new SQLiteDraftRepository(getDatabase),
};
