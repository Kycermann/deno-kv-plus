export type DenoKvWithSafeAtomics = Deno.Kv & {
  setSafeAtomicMany: (
    keys: any[][],
    updateValues: (
      values: unknown[],
      abort: (reason?: string) => void,
    ) => unknown[] | void,
    retryCount?: number,
  ) => Promise<SafeAtomicManyResponse>;

  setSafeAtomic: (
    key: any[],
    updateValue: (
      value: unknown,
      abort: (reason?: string) => void,
    ) => unknown | void,
    retryCount?: number,
  ) => Promise<SafeAtomicSingleResponse>;
};

export type SafeAtomicResponse = {
  ok: boolean;
  error: string | null;
};

export type SafeAtomicSingleResponse = SafeAtomicResponse & {
  value: unknown;
};

export type SafeAtomicManyResponse = SafeAtomicResponse & {
  values: unknown[];
};

/**
 * Adds the {setSafeAtomicMany} method to the Deno KV instance.
 *
 * @param denoKvInstance A Deno KV instance.
 * @returns A Deno KV instance with the {setSafeAtomicMany} method.
 */
export function withSafeAtomics(
  denoKvInstance: Deno.Kv,
): DenoKvWithSafeAtomics {
  Object.defineProperty(denoKvInstance, "setSafeAtomicMany", {
    value: setSafeAtomicMany,
  });

  Object.defineProperty(denoKvInstance, "setSafeAtomic", {
    value: setSafeAtomic,
  });

  return denoKvInstance as DenoKvWithSafeAtomics;
}

/**
 * Atomically updates several values in the KV store. Guarantees that {updateValues} will be called with the latest values from Deno KV, and result committed- or this will be re-tried until successful.
 *
 * @param keys An array of keys to update.
 * @param updateValues A callback that will be called with the most up-to-date values for the given keys. The callback should return an array of values to update. It's OK to modify and return the same values that were passed in.
 * @param retryCount The number of times to retry the update callback if it fails. Defaults to 5.
 */
async function setSafeAtomicMany(
  this: DenoKvWithSafeAtomics,
  keys: any[][],
  updateValues: (
    values: unknown[],
    abort: (reason?: string) => void,
  ) => unknown[] | void,
  retryCount: number = 10,
): Promise<SafeAtomicManyResponse> {
  const results = await this.getMany(keys);
  const resultValues: unknown[] = results.map(
    (result: Deno.KvEntryMaybe<unknown>) => result.value,
  );

  // Let user abort update if they want to
  let aborting = false;
  let abortReason: string | null = null;

  const abort = (reason?: string) => {
    aborting = true;
    if (reason) abortReason = reason;
  };

  // Save original values (to return if we abort)
  const originalResultValues = structuredClone(resultValues);

  // @ts-ignore
  const updatedValues = updateValues(
    resultValues,
    abort,
  ) as unknown as any as unknown[];
  if (aborting) return { ok: false, error: abortReason, values: originalResultValues };

  if (!updatedValues) {
    throw new Error("updateValues must return an array of values to update");
  }

  // Make sure {updatedValues} contains the same number of values as {results}
  if (updatedValues.length !== results.length) {
    throw new Error(
      "The number of resuts returned from the update callback must match the number of keys",
    );
  }

  const tx = this.atomic();

  for (let i = 0; i !== updatedValues.length; i++) {
    tx.check(results[i]);
    tx.set(results[i].key, updatedValues[i]);
  }

  const { ok } = await tx.commit();

  if (ok) return { ok, error: null, values: updatedValues };

  if (!ok && retryCount === 0) {
    return { ok, error: "Failed to commit transaction", values: originalResultValues };
  }

  return this.setSafeAtomicMany(keys, updateValues, retryCount - 1);
}

async function setSafeAtomic(
  this: DenoKvWithSafeAtomics,
  key: any[],
  updateValue: (
    value: unknown,
    abort: (reason?: string) => void,
  ) => unknown | void,
  retryCount: number,
): Promise<SafeAtomicSingleResponse> {
  const { ok, error, values } = await this.setSafeAtomicMany(
    [key],
    (values: unknown[], abort: (reason?: string) => void) => {
      return [updateValue(values[0], abort)];
    },
    retryCount,
  );

  return { ok, error, value: values[0] };
}
