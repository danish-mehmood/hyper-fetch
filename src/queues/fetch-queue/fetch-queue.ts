import {
  FetchQueueStoreKeyType,
  FetchQueueStoreValueType,
  FetchQueueValueType,
} from "./fetch-queue.types";

export const FetchQueueStore = new Map<FetchQueueStoreKeyType, FetchQueueStoreValueType>();

/**
 * Queue class was made to store controlled request Fetches, and firing them one-by-one per queue.
 * Generally requests should be flushed at the same time, the queue provide mechanism to fire them in the order.
 */
export class FetchQueue {
  constructor(private requestKey: string) {}

  add = async (queueElement: FetchQueueValueType): Promise<void> => {
    const queueEntity = this.get();

    // If no concurrent requests found
    if (!queueEntity) {
      // 1. Add to queue
      FetchQueueStore.set(this.requestKey, queueElement);
      // 2. Start request
      await queueElement.request.fetch();
      // 3. Remove from queue
      this.delete();
    }
  };

  get = (): FetchQueueValueType | undefined => {
    const storedEntity = FetchQueueStore.get(this.requestKey);

    return storedEntity;
  };

  delete = (): void => {
    FetchQueueStore.delete(this.requestKey);
  };

  destroy = (): void => {
    FetchQueueStore.clear();
  };
}