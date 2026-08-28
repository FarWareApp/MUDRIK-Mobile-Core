import { AttachmentPicker } from '../../contracts/AttachmentPicker';
import { AttachmentRepository } from '../../contracts/AttachmentRepository';
import { CompanionRepository } from '../../contracts/CompanionRepository';
import { ConnectivityService } from '../../contracts/ConnectivityService';
import { ConversationRepository } from '../../contracts/ConversationRepository';
import { DraftRepository } from '../../contracts/DraftRepository';
import { MessageRepository } from '../../contracts/MessageRepository';
import { MessageTransport } from '../../contracts/MessageTransport';
import { NotificationService } from '../../contracts/NotificationService';
import { PermissionService } from '../../contracts/PermissionService';
import { SettingsRepository } from '../../contracts/SettingsRepository';
import { ProjectRepository } from '../../contracts/ProjectRepository';
import { ProjectConversationRepository } from '../../contracts/ProjectConversationRepository';
import { ProjectAttachmentRepository } from '../../contracts/ProjectAttachmentRepository';

import { AttachmentCleanupService } from '../../features/attachments/AttachmentCleanupService';
import { AttachmentImportService } from '../../features/attachments/AttachmentImportService';
import { AttachmentMaintenanceService } from '../../features/attachments/AttachmentMaintenanceService';
import { NativeAttachmentPicker } from '../../features/attachments/pickers/NativeAttachmentPicker';
import { AttachmentFileStore } from '../../features/attachments/storage/AttachmentFileStore';
import { SQLiteAttachmentRepository } from '../../features/attachments/storage/SQLiteAttachmentRepository';

import { SQLiteDraftRepository } from '../../features/chat/storage/SQLiteDraftRepository';
import { SQLiteMessageRepository } from '../../features/chat/storage/SQLiteMessageRepository';
import { SQLiteConversationRepository } from '../../features/conversations/storage/SQLiteConversationRepository';

import { NativePermissionService } from '../../features/permissions/services/NativePermissionService';
import { SQLiteSettingsRepository } from '../../features/settings/storage/SQLiteSettingsRepository';
import { SQLiteCompanionRepository } from '../../features/companion/storage/SQLiteCompanionRepository';
import { NativeConnectivityService } from '../../features/connectivity/services/NativeConnectivityService';
import { ExpoNotificationService } from '../../features/notifications/services/ExpoNotificationService';
import { SQLiteProjectRepository } from '../../features/projects/storage/SQLiteProjectRepository';
import { SQLiteProjectConversationRepository } from '../../features/projects/storage/SQLiteProjectConversationRepository';
import { SQLiteProjectAttachmentRepository } from '../../features/projects/storage/SQLiteProjectAttachmentRepository';
import { MockMessageTransport } from '../../mocks/MockMessageTransport';
import { getDatabase } from '../storage/Database';

const attachmentRepository =
  new SQLiteAttachmentRepository(
    getDatabase,
  );

const attachmentFileStore =
  new AttachmentFileStore();

const attachmentCleanupService =
  new AttachmentCleanupService(
    attachmentRepository,
    attachmentFileStore,
  );

export type AppServices = {
  messageTransport: MessageTransport;

  conversationRepository:
    ConversationRepository;

  messageRepository:
    MessageRepository;

  draftRepository:
    DraftRepository;

  attachmentRepository:
    AttachmentRepository;

  attachmentPicker:
    AttachmentPicker;

  attachmentImportService:
    AttachmentImportService;

  attachmentFileStore:
    AttachmentFileStore;

  attachmentCleanupService:
    AttachmentCleanupService;

  attachmentMaintenanceService:
    AttachmentMaintenanceService;

  settingsRepository:
    SettingsRepository;

  permissionService:
    PermissionService;

  projectRepository:
    ProjectRepository;

  projectConversationRepository:
    ProjectConversationRepository;

  projectAttachmentRepository:
    ProjectAttachmentRepository;

  companionRepository:
    CompanionRepository;

  connectivityService:
    ConnectivityService;

  notificationService:
    NotificationService;
};

export const appServices: AppServices = {
  messageTransport:
    new MockMessageTransport(),

  conversationRepository:
    new SQLiteConversationRepository(
      getDatabase,
    ),

  messageRepository:
    new SQLiteMessageRepository(
      getDatabase,
    ),

  draftRepository:
    new SQLiteDraftRepository(
      getDatabase,
    ),

  attachmentRepository,

  attachmentPicker:
    new NativeAttachmentPicker(),

  attachmentImportService:
    new AttachmentImportService(
      attachmentRepository,
      attachmentFileStore,
    ),

  attachmentFileStore,

  attachmentCleanupService,

  attachmentMaintenanceService:
    new AttachmentMaintenanceService(
      attachmentCleanupService,
    ),

  settingsRepository:
    new SQLiteSettingsRepository(
      getDatabase,
    ),

  permissionService:
    new NativePermissionService(),

  projectRepository:
    new SQLiteProjectRepository(
      getDatabase,
    ),

  projectConversationRepository:
    new SQLiteProjectConversationRepository(
      getDatabase,
    ),

  projectAttachmentRepository:
    new SQLiteProjectAttachmentRepository(
      getDatabase,
    ),

  companionRepository:
    new SQLiteCompanionRepository(
      getDatabase,
    ),

  connectivityService:
    new NativeConnectivityService(),

  notificationService:
    new ExpoNotificationService(),
};
