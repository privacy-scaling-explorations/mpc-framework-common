import BufferQueue from "./BufferQueue.js";

/**
 * A store for managing multiple BufferQueue instances based on key pairs.
 * Useful for handling communication between multiple parties in secure MPC protocols.
 */
export default class BufferQueueStore {
  private bqs = new Map<string, BufferQueue>();

  /**
   * Gets or creates a BufferQueue for a specific key.
   * @param key - The unique identifier for the queue
   * @returns A BufferQueue instance for the specified key
   */
  get(key: string): BufferQueue {
    if (!this.bqs.has(key)) {
      this.bqs.set(key, new BufferQueue());
    }
    
    return this.bqs.get(key)!;
  }
}
