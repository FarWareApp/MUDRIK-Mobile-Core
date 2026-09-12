import type {
  DraftRepository,
} from '../../contracts/DraftRepository';

export function createDraftPersistenceRepository(
  enabled: boolean,
  repository: DraftRepository,
): DraftRepository {
  if (enabled) {
    return repository;
  }

  return {
    get: async (conversationId) => {
      await repository.clear(
        conversationId,
      );

      return null;
    },

    save: async () => {
      // Text draft persistence is intentionally disabled.
    },

    clear: async (conversationId) => {
      await repository.clear(
        conversationId,
      );
    },
  };
}
