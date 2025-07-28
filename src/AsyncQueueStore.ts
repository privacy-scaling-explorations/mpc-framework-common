import AsyncQueue from "./AsyncQueue.js";

/**
 * A store for managing multiple AsyncQueue instances based on key pairs.
 * Useful for handling asynchronous communication between multiple parties or components.
 */
export default class AsyncQueueStore<T> {
  private aqs = new Map<string, AsyncQueue<T>>();

  /**
   * Gets or creates an AsyncQueue for a specific key.
   * @param key - The unique identifier for the queue
   * @returns An AsyncQueue instance for the specified key
   */
  get(key: string): AsyncQueue<T> {
    if (!this.aqs.has(key)) {
      this.aqs.set(key, new AsyncQueue<T>());
    }
    
    return this.aqs.get(key)!;
  }
}
