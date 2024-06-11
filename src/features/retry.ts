/**
 * This is a chatGPT generated function, don't blame me. I did verify it works:
```ts
console.log(retryCount, {
  backoff: delay * Math.pow(factor, retries - retryCount),
  retryCount,
});
```
as the first line of the `attempt` function produced: 
```
> 5 { backoff: 20, retryCount: 5 }
> 4 { backoff: 40, retryCount: 4 }
> 3 { backoff: 80, retryCount: 3 }
> 2 { backoff: 160, retryCount: 2 }
> 1 { backoff: 320, retryCount: 1 }
> 0 { backoff: 640, retryCount: 0 }
```

 * Retries a promise-returning function with exponential backoff.
 *
 * @template T
 * @param {() => Promise<T>} fn - The function returning a promise to be retried.
 * @param {number} [retries=3] - The number of retry attempts.
 * @param {number} [delayMs=1000] - The initial delay in milliseconds before retrying.
 * @returns {Promise<T>} A promise that resolves with the result of the function or rejects after all retries have been exhausted.
 */
export function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const attempt = (retryCount: number) => {
      fn()
        .then(resolve)
        .catch((error) => {
          if (retryCount <= 0) {
            reject(error);
          } else {
            setTimeout(() => {
              attempt(retryCount - 1);
            }, delayMs * Math.pow(2, retries - retryCount));
          }
        });
    };

    attempt(retries);
  });
}
