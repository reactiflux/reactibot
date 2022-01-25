export const sleep = (seconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(() => resolve(), seconds * 1000);
  });
