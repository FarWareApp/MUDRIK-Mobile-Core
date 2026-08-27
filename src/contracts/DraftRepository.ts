export type DraftRecord = {
  conversationId: string;
  text: string;
  updatedAt: number;
};

export interface DraftRepository {
  get(
    conversationId: string,
  ): Promise<DraftRecord | null>;

  save(
    draft: DraftRecord,
  ): Promise<void>;

  clear(
    conversationId: string,
  ): Promise<void>;
}
