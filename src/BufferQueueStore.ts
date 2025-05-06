import BufferQueue from "./BufferQueue.js";

/**
 * A store for managing multiple BufferQueue instances based on key pairs.
 * Useful for handling communication between multiple parties in secure MPC protocols.
 */
export default class BufferQueueStore {
  private bqs = new Map<string, BufferQueue>();

  /**
   * Gets or creates a BufferQueue for a specific communication channel between parties.
   * @param from - The sender party (number or string identifier)
   * @param to - The recipient party (number or string identifier)
   * @param channel - The channel identifier ('a' or 'b')
   * @returns A BufferQueue instance for the specified communication channel
   */
  get(from: number | string, to: number | string, channel: 'a' | 'b'): BufferQueue {
    const key = `${from}-${to}-${channel}`;
    
    if (!this.bqs.has(key)) {
      this.bqs.set(key, new BufferQueue());
    }
    
    return this.bqs.get(key)!;
  }
}
