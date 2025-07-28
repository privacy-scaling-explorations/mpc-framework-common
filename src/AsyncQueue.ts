/**
 * A generic async queue implementation for managing asynchronous data flow.
 * Allows pushing items to the queue and popping items with async/await support.
 */
export default class AsyncQueue<T> {
  messages: T[] = [];
  pendingResolves: ((msg: T) => void)[] = [];

  /**
   * Pushes a new item to the queue and resolves any pending pop operations if possible.
   * @param msg - The msg to push into the queue.
   * @throws {Error} If the queue is closed.
   */
  push(msg: T) {
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
   * @returns A Promise resolving with the popped item.
   * @throws {Error} If the queue is closed.
   */
  async pop(abortSignal?: AbortSignal): Promise<T> {
    if (this.messages.length > 0) {
      return this.messages.shift()!;
    }

    return new Promise((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(new Error('Stream stopped'));
        return;
      }

      const wrapperFn = (msg: T) => {
        abortSignal?.removeEventListener('abort', onAbort);
        resolve(msg);
      };

      const onAbort = () => {
        this.pendingResolves = this.pendingResolves.filter(r => r !== wrapperFn);
        abortSignal?.removeEventListener('abort', onAbort);
        reject(new Error('Stream stopped'));
      };

      abortSignal?.addEventListener('abort', onAbort);

      this.pendingResolves.push(wrapperFn);
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
}
