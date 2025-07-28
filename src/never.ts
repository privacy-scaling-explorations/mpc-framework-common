/**
 * A utility function that throws an error when a code path that should never be executed is reached.
 * Useful for exhaustive type checking and marking unreachable code paths.
 * 
 * @param value - The value that should never occur
 * @param message - Optional custom error message
 * @returns Never returns, always throws an error
 */
export default function never(value: never, message = `Unexpected value: ${value}`): never {
  throw new Error(message);
}
