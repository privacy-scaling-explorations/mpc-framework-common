/**
 * A generic async queue implementation for managing asynchronous data flow.
 * Allows pushing items to the queue and popping items with async/await support.
 */
export default class AsyncQueue<T> {
  private queue: T[] = [];
  private pendingPops: Array<{ 
    resolve: (value: T) => void,
    reject: (error: Error) => void
  }> = [];
  private closed = false;

  /**
   * Pushes a new item to the queue and resolves any pending pop operations if possible.
   * @param item - The item to push into the queue.
   * @throws {Error} If the queue is closed.
   */
  push(item: T): void {
    if (this.closed) {
      throw new Error('Queue is closed');
    }

    if (this.pendingPops.length > 0) {
      const { resolve } = this.pendingPops.shift()!;
      resolve(item);
    } else {
      this.queue.push(item);
    }
  }

  /**
   * Pops an item from the queue. Returns a Promise that resolves with the popped item.
   * If the queue is empty, the Promise will be resolved when an item is pushed.
   * @returns A Promise resolving with the popped item.
   * @throws {Error} If the queue is closed.
   */
  pop(): Promise<T> {
    if (this.queue.length > 0) {
      return Promise.resolve(this.queue.shift()!);
    } else if (!this.closed) {
      return new Promise((resolve, reject) => {
        this.pendingPops.push({ resolve, reject });
      });
    } else {
      return Promise.reject(new Error('Queue is closed'));
    }
  }

  /**
   * Closes the queue, preventing any further items from being pushed.
   * Rejects any pending pop operations.
   */
  close(): void {
    this.closed = true;
    
    for (const { reject } of this.pendingPops) {
      reject(new Error('Queue is closed'));
    }
    
    this.pendingPops = [];
  }

  /**
   * Checks if the queue is closed.
   * @returns True if the queue is closed, false otherwise.
   */
  isClosed(): boolean {
    return this.closed;
  }
}
