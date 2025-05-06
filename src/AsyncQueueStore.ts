import AsyncQueue from "./AsyncQueue.js";

/**
 * A store for managing multiple AsyncQueue instances based on key pairs.
 * Useful for handling asynchronous communication between multiple parties or components.
 */
export default class AsyncQueueStore<T> {
  private aqs = new Map<string, AsyncQueue<T>>();

  /**
   * Gets or creates an AsyncQueue for a specific communication channel.
   * @param from - The sender identifier (number or string)
   * @param to - The recipient identifier (number or string)
   * @param channel - The channel identifier (typically 'a' or 'b')
   * @returns An AsyncQueue instance for the specified communication channel
   */
  get(from: number | string, to: number | string, channel: string): AsyncQueue<T> {
    const key = `${from}-${to}-${channel}`;
    
    if (!this.aqs.has(key)) {
      this.aqs.set(key, new AsyncQueue<T>());
    }
    
    return this.aqs.get(key)!;
  }
}
