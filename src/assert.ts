/**
 * Type-guard assertion function that throws an error if the condition is not met.
 * @param condition - The condition to check
 * @param message - Optional custom error message
 */
export default function assert(
  condition: unknown,
  message = 'Assertion failed',
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
