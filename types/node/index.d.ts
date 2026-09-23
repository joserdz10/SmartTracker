declare namespace NodeJS {
  interface ProcessEnv { [key: string]: string | undefined }
  interface Process { env: ProcessEnv }
  interface ErrnoException extends Error { code?: string }
}
declare const process: NodeJS.Process;

declare module "node:fs/promises" {
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<string | undefined>;
  export function readFile(path: string, encoding: "utf8"): Promise<string>;
  export function rename(oldPath: string, newPath: string): Promise<void>;
  export function writeFile(path: string, data: string, encoding: "utf8"): Promise<void>;
}

declare module "node:path" {
  export function dirname(path: string): string;
}

declare module "node:test" {
  type TestFn = (name: string, fn: () => void | Promise<void>) => void;
  const test: TestFn;
  export default test;
}

declare module "node:assert/strict" {
  interface Assert {
    equal(actual: unknown, expected: unknown): void;
    ok(value: unknown): asserts value;
  }
  const assert: Assert;
  export default assert;
}
