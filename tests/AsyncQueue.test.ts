import { expect } from "chai";
import AsyncQueue from "../src/AsyncQueue.js";

describe('AsyncQueue', () => {
  describe('push and pop', () => {
    it('should push and pop a single item', async () => {
      const queue = new AsyncQueue<string>();
      queue.push('test');
      const result = await queue.pop();
      expect(result).to.equal('test');
    });

    it('should handle multiple items in order (FIFO)', async () => {
      const queue = new AsyncQueue<string>();
      queue.push('first');
      queue.push('second');
      queue.push('third');

      expect(await queue.pop()).to.equal('first');
      expect(await queue.pop()).to.equal('second');
      expect(await queue.pop()).to.equal('third');
    });

    it('should resolve pending pop when item is pushed', async () => {
      const queue = new AsyncQueue<string>();
      const popPromise = queue.pop();
      queue.push('async-item');
      const result = await popPromise;
      expect(result).to.equal('async-item');
    });

    it('should handle multiple pending pops', async () => {
      const queue = new AsyncQueue<string>();
      const pop1 = queue.pop();
      const pop2 = queue.pop();
      const pop3 = queue.pop();

      queue.push('item1');
      queue.push('item2');
      queue.push('item3');

      const results = await Promise.all([pop1, pop2, pop3]);
      expect(results).to.deep.equal(['item1', 'item2', 'item3']);
    });

    it('should work with different types', async () => {
      const numberQueue = new AsyncQueue<number>();
      numberQueue.push(42);
      expect(await numberQueue.pop()).to.equal(42);

      const objectQueue = new AsyncQueue<{ id: number; name: string }>();
      const testObj = { id: 1, name: 'test' };
      objectQueue.push(testObj);
      expect(await objectQueue.pop()).to.deep.equal(testObj);
    });
  });

  describe('pop with AbortSignal', () => {
    it('should abort pending pop when signal is aborted', async () => {
      const queue = new AsyncQueue<string>();
      const abortController = new AbortController();
      const popPromise = queue.pop(abortController.signal);
      
      abortController.abort();
      
      try {
        await popPromise;
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal('Stream stopped');
      }
    });

    it('should reject immediately if signal is already aborted', async () => {
      const queue = new AsyncQueue<string>();
      const abortController = new AbortController();
      abortController.abort();
      
      try {
        await queue.pop(abortController.signal);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal('Stream stopped');
      }
    });

    it('should handle abort signal correctly', async () => {
      const queue = new AsyncQueue<string>();
      const abortController = new AbortController();
      const popPromise = queue.pop(abortController.signal);
      
      // Abort the pop
      abortController.abort();
      
      // Should reject with the expected error
      try {
        await popPromise;
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.equal('Stream stopped');
      }
    });

    it('should clean up event listeners when pop resolves normally', async () => {
      const queue = new AsyncQueue<string>();
      const abortController = new AbortController();
      const popPromise = queue.pop(abortController.signal);
      
      queue.push('test');
      const result = await popPromise;
      
      expect(result).to.equal('test');
      
      // Aborting after resolution shouldn't affect anything
      abortController.abort();
    });

    it('should work correctly when item is available immediately', async () => {
      const queue = new AsyncQueue<string>();
      const abortController = new AbortController();
      queue.push('immediate');
      
      const result = await queue.pop(abortController.signal);
      expect(result).to.equal('immediate');
    });

    it('should not affect other pending pops when one is aborted', async () => {
      const queue = new AsyncQueue<string>();
      const abortController = new AbortController();
      const pop1 = queue.pop(abortController.signal);
      const pop2 = queue.pop();
      
      // Abort the first pop
      abortController.abort();
      
      // Wait for the first pop to be rejected
      try {
        await pop1;
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.equal('Stream stopped');
      }
      
      // Push an item - it should go to the second pop since the first was cleaned up
      queue.push('test');
      const result = await pop2;
      expect(result).to.equal('test');
    });
  });

  describe('stream', () => {
    it('should call handler for each item pushed to queue', async () => {
      const queue = new AsyncQueue<string>();
      const results: string[] = [];
      const stream = queue.stream((msg) => {
        results.push(msg);
      });

      queue.push('item1');
      queue.push('item2');
      queue.push('item3');

      // Give some time for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(results).to.deep.equal(['item1', 'item2', 'item3']);
      
      stream.stop();
    });

    it('should handle items that are already in queue when stream starts', async () => {
      const queue = new AsyncQueue<string>();
      queue.push('existing1');
      queue.push('existing2');

      const results: string[] = [];
      const stream = queue.stream((msg) => {
        results.push(msg);
      });

      // Give some time for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(results).to.deep.equal(['existing1', 'existing2']);
      
      stream.stop();
    });

    it('should stop processing when stop() is called', async () => {
      const queue = new AsyncQueue<string>();
      const results: string[] = [];
      const stream = queue.stream((msg) => {
        results.push(msg);
      });

      queue.push('item1');
      await new Promise(resolve => setTimeout(resolve, 5));
      
      stream.stop();
      
      queue.push('item2');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(results).to.deep.equal(['item1']);
    });

    it('should handle multiple concurrent streams', async () => {
      const queue = new AsyncQueue<string>();
      const results1: string[] = [];
      const results2: string[] = [];
      
      const stream1 = queue.stream((msg) => {
        results1.push(`stream1-${msg}`);
      });
      
      const stream2 = queue.stream((msg) => {
        results2.push(`stream2-${msg}`);
      });

      queue.push('test');
      
      // Give some time for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      // Only one stream should get the message (whoever pops first)
      const totalResults = results1.length + results2.length;
      expect(totalResults).to.equal(1);
      
      stream1.stop();
      stream2.stop();
    });

    it('should stop processing when handler throws error', async () => {
      const queue = new AsyncQueue<string>();
      const results: string[] = [];
      let errorThrown = false;
      
      const stream = queue.stream((msg) => {
        if (msg === 'error-item') {
          errorThrown = true;
          throw new Error('Handler error');
        }
        results.push(msg);
      });

      queue.push('item1');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      queue.push('error-item');
      await new Promise(resolve => setTimeout(resolve, 20));
      
      queue.push('item2');
      await new Promise(resolve => setTimeout(resolve, 10));

      // The stream should have stopped after the error
      expect(results).to.deep.equal(['item1']);
      expect(errorThrown).to.be.true;
      
      stream.stop();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle rapid push/pop operations', async () => {
      const queue = new AsyncQueue<string>();
      const promises: Promise<string>[] = [];
      const items: string[] = [];

      // Create multiple pending pops
      for (let i = 0; i < 100; i++) {
        promises.push(queue.pop());
      }

      // Push items rapidly
      for (let i = 0; i < 100; i++) {
        const item = `item-${i}`;
        items.push(item);
        queue.push(item);
      }

      const results = await Promise.all(promises);
      expect(results).to.deep.equal(items);
    });

    it('should maintain order under concurrent operations', async () => {
      const queue = new AsyncQueue<string>();
      const results: string[] = [];
      
      // Start a stream
      const stream = queue.stream((msg) => {
        results.push(msg);
      });

      // Mix of immediate items and async pops
      queue.push('immediate1');
      const pop1 = queue.pop();
      queue.push('immediate2');
      const pop2 = queue.pop();
      
      queue.push('stream1');
      queue.push('stream2');

      await Promise.all([pop1, pop2]);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should have processed some items through stream
      expect(results.length).to.be.greaterThan(0);
      
      stream.stop();
    });

    it('should handle empty queue operations gracefully', async () => {
      const queue = new AsyncQueue<string>();
      // Multiple pops on empty queue
      const pop1 = queue.pop();
      const pop2 = queue.pop();
      
      setTimeout(() => {
        queue.push('delayed1');
        queue.push('delayed2');
      }, 5);

      const results = await Promise.all([pop1, pop2]);
      expect(results).to.deep.equal(['delayed1', 'delayed2']);
    });
  });

  describe('memory management', () => {
    it('should clean up pending resolves when aborted', () => {
      const queue = new AsyncQueue<string>();
      return new Promise<void>((testResolve) => {
        const abortController = new AbortController();
        
        // Create pending pop
        const popPromise = queue.pop(abortController.signal);
        
        // Verify there's a pending resolve
        expect(queue.pendingResolves.length).to.equal(1);
        
        abortController.abort();
        
        popPromise.catch(() => {
          // After the fix, the cleanup should work correctly
          expect(queue.pendingResolves.length).to.equal(0);
          testResolve();
        });
      });
    });

    it('should clean up all pending resolves when multiple are aborted', () => {
      const queue = new AsyncQueue<string>();
      return new Promise<void>((testResolve) => {
        const abortControllers: AbortController[] = [];
        const popPromises: Promise<string>[] = [];
        
        // Create multiple pending pops
        for (let i = 0; i < 5; i++) {
          const controller = new AbortController();
          abortControllers.push(controller);
          popPromises.push(queue.pop(controller.signal));
        }
        
        expect(queue.pendingResolves.length).to.equal(5);
        
        // Abort all
        abortControllers.forEach(controller => controller.abort());
        
        // Wait for all to reject
        Promise.allSettled(popPromises).then(results => {
          // All should be rejected
          results.forEach(result => {
            expect(result.status).to.equal('rejected');
            if (result.status === 'rejected') {
              expect(result.reason.message).to.equal('Stream stopped');
            }
          });
          
          // All pending resolves should be cleaned up after the fix
          expect(queue.pendingResolves.length).to.equal(0);
          testResolve();
        });
      });
    });

    it('should handle mixed abort and normal operations correctly', async () => {
      const queue = new AsyncQueue<string>();
      const abortController1 = new AbortController();
      const abortController2 = new AbortController();
      
      // Create some pending pops - some with abort signals, some without
      const pop1 = queue.pop(abortController1.signal); // Will be aborted
      const pop2 = queue.pop(); // Normal pop
      const pop3 = queue.pop(abortController2.signal); // Will be aborted
      const pop4 = queue.pop(); // Normal pop
      
      expect(queue.pendingResolves.length).to.equal(4);
      
      // Abort some of them
      abortController1.abort();
      abortController2.abort();
      
      // The aborted ones should reject
      try {
        await pop1;
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.equal('Stream stopped');
      }
      
      try {
        await pop3;
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.equal('Stream stopped');
      }
      
      // Should have 2 pending resolves left (the non-aborted ones)
      expect(queue.pendingResolves.length).to.equal(2);
      
      // Push items to resolve the remaining pops
      queue.push('item1');
      queue.push('item2');
      
      const results = await Promise.all([pop2, pop4]);
      expect(results).to.deep.equal(['item1', 'item2']);
      
      // All pending resolves should be cleared
      expect(queue.pendingResolves.length).to.equal(0);
    });
  });

  describe('close functionality', () => {
    it('should indicate when queue is closed', () => {
      const queue = new AsyncQueue<string>();
      expect(queue.isClosed()).to.be.false;
      
      queue.close();
      expect(queue.isClosed()).to.be.true;
    });

    it('should throw when pushing to a closed queue', () => {
      const queue = new AsyncQueue<string>();
      queue.close();
      
      expect(() => queue.push('test')).to.throw('Queue is closed');
    });

    it('should throw when popping from a closed queue', async () => {
      const queue = new AsyncQueue<string>();
      queue.close();
      
      try {
        await queue.pop();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.equal('Queue is closed');
      }
    });

    it('should reject pending pops when queue is closed', async () => {
      const queue = new AsyncQueue<string>();
      const pop1 = queue.pop();
      const pop2 = queue.pop();
      const pop3 = queue.pop();
      
      // Verify we have pending operations
      expect(queue.pendingResolves.length).to.equal(3);
      
      queue.close();
      
      // All pending operations should be rejected
      const results = await Promise.allSettled([pop1, pop2, pop3]);
      
      results.forEach(result => {
        expect(result.status).to.equal('rejected');
        if (result.status === 'rejected') {
          expect(result.reason.message).to.equal('Queue is closed');
        }
      });
      
      // Pending arrays should be cleared
      expect(queue.pendingResolves.length).to.equal(0);
      expect(queue.pendingRejects.length).to.equal(0);
    });

    it('should clear existing messages when closed', () => {
      const queue = new AsyncQueue<string>();
      queue.push('msg1');
      queue.push('msg2');
      queue.push('msg3');
      
      expect(queue.messages.length).to.equal(3);
      
      queue.close();
      
      expect(queue.messages.length).to.equal(0);
    });

    it('should handle multiple close calls gracefully', () => {
      const queue = new AsyncQueue<string>();
      
      queue.close();
      expect(queue.isClosed()).to.be.true;
      
      // Second close should not throw
      queue.close();
      expect(queue.isClosed()).to.be.true;
    });

    it('should reject mixed pending operations correctly when closed', async () => {
      const queue = new AsyncQueue<string>();
      const abortController = new AbortController();
      
      const pop1 = queue.pop(); // Normal pop
      const pop2 = queue.pop(abortController.signal); // Pop with abort signal
      const pop3 = queue.pop(); // Normal pop
      
      expect(queue.pendingResolves.length).to.equal(3);
      expect(queue.pendingRejects.length).to.equal(3);
      
      queue.close();
      
      const results = await Promise.allSettled([pop1, pop2, pop3]);
      
      results.forEach(result => {
        expect(result.status).to.equal('rejected');
        if (result.status === 'rejected') {
          expect(result.reason.message).to.equal('Queue is closed');
        }
      });
      
      expect(queue.pendingResolves.length).to.equal(0);
      expect(queue.pendingRejects.length).to.equal(0);
    });

    it('should stop streams when queue is closed', async () => {
      const queue = new AsyncQueue<string>();
      const results: string[] = [];
      
      const stream = queue.stream((msg) => {
        results.push(msg);
      });
      
      queue.push('item1');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      queue.close();
      
      // Give some time to see if stream tries to continue
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(results).to.deep.equal(['item1']);
      
      stream.stop();
    });

    it('should handle close during stream processing', async () => {
      const queue = new AsyncQueue<string>();
      const results: string[] = [];
      let errorCaught = false;
      
      const stream = queue.stream((msg) => {
        results.push(msg);
        if (msg === 'item2') {
          // Close the queue during processing
          queue.close();
        }
      });
      
      queue.push('item1');
      queue.push('item2');
      
      // Give time for processing
      await new Promise(resolve => setTimeout(resolve, 30));
      
      expect(results).to.include('item1');
      expect(results).to.include('item2');
      
      stream.stop();
    });
  });
});
