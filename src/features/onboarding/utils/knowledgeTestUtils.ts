import type { KnowledgeTestAttemptState } from "../types";
import { container } from "@/infrastructure/config/Container";
import { env } from "@/infrastructure/config/env";

export const formatRemainingTime = (remainingMs: number): string => {
  const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours > 0 ? `${hours} saat ${minutes} dakika` : `${minutes} dakika`;
};

export const clearKnowledgeTestAttemptState = async (): Promise<void> => {
  await container.tokenStorage
    .deleteItem(env.knowledgeTestAttemptKey)
    .catch(() => undefined);
};

export const saveKnowledgeTestAttemptState = async (
  state: KnowledgeTestAttemptState,
): Promise<void> => {
  await container.tokenStorage
    .setItem(env.knowledgeTestAttemptKey, JSON.stringify(state))
    .catch(() => undefined);
};

export const loadKnowledgeTestAttemptState = async (): Promise<KnowledgeTestAttemptState | null> => {
  try {
    const storedState = await container.tokenStorage.getItem(
      env.knowledgeTestAttemptKey,
    );

    if (!storedState) {
      return null;
    }

    const parsedState = JSON.parse(
      storedState,
    ) as KnowledgeTestAttemptState;
    
    return parsedState;
  } catch {
    await clearKnowledgeTestAttemptState();
    return null;
  }
};
