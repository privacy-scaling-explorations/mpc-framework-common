/**
 * A generic async queue implementation for managing asynchronous data flow.
 * Allows pushing items to the queue and popping items with async/await support.
 * The queue can be closed to prevent further operations and clean up resources.
 */
export default class AsyncQueue<T> {
  messages: T[] = [];
  pendingResolves: ((msg: T) => void)[] = [];
  pendingRejects: ((error: Error) => void)[] = [];
  private closed = false;

  /**
   * Pushes a new item to the queue and resolves any pending pop operations if possible.
   * @param msg - The msg to push into the queue.
   * @throws {Error} If the queue is closed.
   */
  push(msg: T) {
    if (this.closed) {
      throw new Error('Queue is closed');
    }

    if (this.pendingResolves.length > 0) {
      const pendingResolve = this.pendingResolves.shift()!;
      pendingResolve(msg);
      return;
    }

    this.messages.push(msg);
  }

  /**
   * Pops an item from the queue. Returns a Promise that resolves with the popped item.
   * If the queue is empty, the Promise will be resolved when an item is pushed.
   * @param abortSignal - Optional AbortSignal to cancel the pop operation
   * @returns A Promise resolving with the popped item.
   * @throws {Error} If the queue is closed.
   */
  async pop(abortSignal?: AbortSignal): Promise<T> {
    if (this.closed) {
      throw new Error('Queue is closed');
    }

    if (this.messages.length > 0) {
      return this.messages.shift()!;
    }

    return new Promise((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(new Error('Stream stopped'));
        return;
      }

      if (this.closed) {
        reject(new Error('Queue is closed'));
        return;
      }

      const wrapperFn = (msg: T) => {
        abortSignal?.removeEventListener('abort', onAbort);
        // Remove from pendingRejects when resolving
        const rejectIndex = this.pendingRejects.indexOf(reject);
        if (rejectIndex >= 0) {
          this.pendingRejects.splice(rejectIndex, 1);
        }
        resolve(msg);
      };

      const onAbort = () => {
        this.pendingResolves = this.pendingResolves.filter(r => r !== wrapperFn);
        const rejectIndex = this.pendingRejects.indexOf(reject);
        if (rejectIndex >= 0) {
          this.pendingRejects.splice(rejectIndex, 1);
        }
        abortSignal?.removeEventListener('abort', onAbort);
        reject(new Error('Stream stopped'));
      };

      abortSignal?.addEventListener('abort', onAbort);

      this.pendingResolves.push(wrapperFn);
      this.pendingRejects.push(reject);
    });
  }

  stream(handler: (msg: T) => void) {
    const abortController = new AbortController();
    const { signal } = abortController;

    const loop = async () => {
      try {
        const msg = await this.pop(signal);
        handler(msg);
        loop();
      } catch (err) {
        if (err instanceof Error && err.message === 'Stream stopped') {
          // Exit the loop gracefully
        } else {
          // Handle other potential errors
          throw err;
        }
      }
    };

    loop();

    return {
      stop() {
        abortController.abort();
      },
    };
  }

  /**
   * Closes the queue. After closing:
   * - push() will throw an error
   * - pending pop() operations will be rejected
   * - new pop() operations will throw an error
   */
  close() {
    if (this.closed) {
      return;
    }

    this.closed = true;

    // Reject all pending pops
    const pendingRejects = this.pendingRejects.slice();
    this.pendingResolves = [];
    this.pendingRejects = [];

    pendingRejects.forEach(reject => {
      reject(new Error('Queue is closed'));
    });

    // Clear messages as well
    this.messages = [];
  }

  /**
   * Returns whether the queue is closed.
   * @returns true if the queue is closed, false otherwise
   */
  isClosed(): boolean {
    return this.closed;
  }
}
