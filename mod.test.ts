import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { withSafeAtomics } from "./mod.ts";

Deno.test("withSafeAtomics monkey patches Deno.Kv", async () => {
  // Arrange
  const mockKey = ["test", "abc"];
  const mockValue = "123";

  // Act
  const kv = withSafeAtomics(await Deno.openKv());
  await kv.set(mockKey, mockValue);
  const { value } = await kv.get(mockKey);
  await kv.close();

  // Assert
  assertEquals(value, mockValue);
});

Deno.test("setSafeAtomic update the values", async () => {
  // Arrange
  const mockKey = ["test", "abc"];
  const mockValue = "123";

  const updateValue = (_value: unknown): unknown => {
    return mockValue;
  };

  // Act
  const kv = withSafeAtomics(await Deno.openKv());
  await kv.setSafeAtomic(mockKey, updateValue);
  const { value: newValue } = await kv.get(mockKey);
  await kv.close();

  // Assert
  assertEquals(newValue, mockValue);
});

Deno.test("setSafeAtomicMany updates multiple values", async () => {
  // Arrange
  const mockKey1 = ["test", "key 1"];
  const mockKey2 = ["test", "key 2"];
  const mockUpdatedValue1 = "new value 1";
  const mockUpdatedValue2 = "new value 2";
  const mockUpdatedValues = [mockUpdatedValue1, mockUpdatedValue2];

  const keys = [mockKey1, mockKey2];
  const updateValues = () => mockUpdatedValues;
  const retryCount = 3;

  // Act
  const kv = withSafeAtomics(await Deno.openKv());
  await kv.setSafeAtomicMany(keys, updateValues, retryCount);
  const { value: newValue1 } = await kv.get(mockKey1);
  const { value: newValue2 } = await kv.get(mockKey2);
  await kv.close();

  // Assert
  assertEquals(newValue1, mockUpdatedValue1);
  assertEquals(newValue2, mockUpdatedValue2);
});

Deno.test(
  "setSafeAtomic does not update the value if abort() is called",
  async () => {
    // Arrange
    const mockKey = ["test", "abc"];
    const mockValue = "123";
    const mockUpdatedValue = "new value";

    const updateValue = (_value: unknown, abort: () => void): unknown => {
      abort();

      return mockUpdatedValue;
    };

    // Act
    const kv = withSafeAtomics(await Deno.openKv());
    await kv.set(mockKey, mockValue);
    await kv.setSafeAtomic(mockKey, updateValue);
    const { value: newValue } = await kv.get(mockKey);
    await kv.close();

    // Assert
    assertEquals(newValue, mockValue);
  },
);

Deno.test(
  "setSafeAtomicMany does not update any values if abort() is called",
  async () => {
    // Arrange
    const mockKey1 = ["test", "key 1"];
    const mockKey2 = ["test", "key 2"];
    const mockValue1 = "value 1";
    const mockValue2 = "value 2";
    const mockUpdatedValue1 = "new value 1";
    const mockUpdatedValue2 = "new value 2";
    const mockUpdatedValues = [mockUpdatedValue1, mockUpdatedValue2];

    const keys = [mockKey1, mockKey2];
    const updateValues = (
      _values: unknown[],
      abort: () => void,
    ): unknown[] | void => {
      abort();
      return mockUpdatedValues;
    };
    const retryCount = 3;

    // Set initial values
    const kv = withSafeAtomics(await Deno.openKv());
    await kv.set(mockKey1, mockValue1);
    await kv.set(mockKey2, mockValue2);

    // Act
    await kv.setSafeAtomicMany(keys, updateValues, retryCount);
    const { value: newValue1 } = await kv.get(mockKey1);
    const { value: newValue2 } = await kv.get(mockKey2);
    await kv.close();

    // Assert
    assertEquals(newValue1, mockValue1);
    assertEquals(newValue2, mockValue2);
  },
);

// TODO: test the retries more thoroughly
// Deno.test(
//   "setSafeAtomicMany retries if values change in the mean time, and updates with latest values",
//   async () => {
//     /// Arrange
//     const mockBalanceKey = ["test", "balance"];
//     // We'll start off with an initial balance of 100
//     const mockInitialBalance = 100;
//     // And try to subtract 50 from it
//     const mockSubtractBalance = 50;
//     // But in the mean time, another process will set it to 25
//     const mockAlteredBalance = 250;

//     const originalDenoKv = await Deno.openKv();

//     let enableCommitMock = true;

//     const denoKvProxy = new Proxy(originalDenoKv, {
//       get: (target, prop, receiver) => {
//         // Overwrite .atomic to return a new proxy
//         // @ts-ignore
//         if (prop !== "atomic") return target[prop];

//         const originalAtomic = target[prop].bind(target);

//         return new Proxy(originalAtomic, {
//           get: (target, prop, receiver) => {
//             // If {enableCommitMock} is true, make .commit return a function
//             // that sets the balance to 25 and then runs the real .commit
//             if (prop !== "commit" || !enableCommitMock) {
//               // @ts-ignore
//               return target[prop];
//             }

//             return async function mockCommit(this: Deno.AtomicOperation) {
//               // Alter the balance before the Deno KV transaction can commit
//               const kv2 = await Deno.openKv();
//               await kv2.set(
//                 mockBalanceKey,
//                 ((await kv.get(mockBalanceKey)).value as number) + 1
//               );
//               await kv2.close();

//               enableCommitMock = false;
//               return this.commit();
//             };
//           },
//         });
//       },
//     });

//     // Mock {kv.atomic#commit} to set the balance to 25 and then unmock itself
//     const kv = withSafeAtomics(denoKvProxy);

//     // Set initial value
//     await kv.set(mockBalanceKey, mockInitialBalance);

//     const keys = [mockBalanceKey];
//     const updateValues = (
//       entries: DenoKvEntry[],
//       abort: () => void
//     ): unknown[] | void => {
//       const balance = entries[0][1] as number;

//       console.log(entries, balance, mockSubtractBalance);
//       if (balance < mockSubtractBalance) {
//         console.log("aborting");
//         abort();
//       }

//       return [balance - mockSubtractBalance];
//     };

//     // Act
//     await kv.setSafeAtomicMany(keys, updateValues);
//     const { value: newBalance } = await kv.get(mockBalanceKey);
//     await kv.close();

//     // Assert
//     assertEquals(newBalance, mockAlteredBalance - mockSubtractBalance);
//   }
// );
