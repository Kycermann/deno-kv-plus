# Deno KV Plus 🚀 Transactions that `{ ok: true }`

Upgrade your Deno KV code with **confidence** and **peace of mind**.

| **Quick links** | [📖 Denoland](https://deno.land/x/kvp) | [🏟️ Discord](https://discord.mieszko.xyz/deno-kv-plus) | [🔗 Article](https://mieszko.xyz/deno-kv-plus) |
| --------------- | -------------------------------------- | ----------------------------------------------------- | ---------------------------------------------- |

## ✨ Features

### 🛡️ Safety First

- Never worry about updates being overwritten by other updates.
- Trust in the fact that calculations are always based on the most up-to-date data.

### 🦾 Unwavering Reliability

- The system tries the same transaction/calculation until the write is successful without interference.
- Every attempt fetches the freshest data and recalculates if the data changes.
- Update process can be aborted if values change and the update is no longer valid (e.g. insufficient balance to complete a transfer).
- Zero dependencies for ultimate compatibility.

## 🎁 A quick demo

```js
import { withSafeAtomics } from "https://deno.land/x/kvp/mod.ts";

// Create a KV instance with atomic support
const kv = withSafeAtomics(await Deno.openKv());

// Increment a visit counter
const { ok, error } = await kv.setSafeAtomic(
  ["view_counter"],
  (value, abort) => value + 1,
);

if (ok) console.log("🎉");
else console.log("ℹ️", error);
```

## 🎬 Usage

### `setSafeAtomic`

A convenient version of `setSafeAtomicMany` for updating just one key. This function ensures atomic updates and retries whenever necessary. Use `setSafeAtomic` when you're updating a single entry and want to guarantee atomic updates.

#### 🌟 Starter template

```ts
import { withSafeAtomics } from "https://deno.land/x/kvp/mod.ts";

const kv = withSafeAtomics(await Deno.openKv());

const { ok, error } = await kv.setAtomic(
  ["this is one", "and the same", "example key"],
  (value, abort) => value,
);
```

#### 📋 Arguments

| Argument     | Type                                                    | Description                                                                                          |
| ------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `key`        | `any[]`                                                 | The key to fetch and update.                                                                         |
| `updateFn`   | `(value: any, abort: (reason?: string) => void) => any` | A function that takes the current value and returns the updated value. Can be called multiple times. |
| `retryCount` | `number`                                                | The number of times to retry the update function if the value changes.                               |

#### 📦 Return object

| Property | Type      | Description                                            |
| -------- | --------- | ------------------------------------------------------ |
| `ok`     | `boolean` | Whether the update was successful.                     |
| `error`  | `string`  | The error message if the update failed or was aborted. |
| `value`  | `unknown` | The new value in Deno KV                               |

### `setSafeAtomicMany`

#### 🌟 Starter template

```ts
import { withSafeAtomics } from "https://deno.land/x/kvp/mod.ts";

const kv = withSafeAtomics(await Deno.openKv());

const { ok, error } = await kv.setAtomicMany(
  [["example", "key", 1], ["example", "key", 2]],
  (values, abort) => values,
);
```

#### 📋 Arguments

| Argument     | Type                                                         | Description                                                                                                      |
| ------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `keys`       | `any[][]`                                                    | An array of keys to fetch and update.                                                                            |
| `updateFn`   | `(values: any[], abort: (reason?: string) => void) => any[]` | A function that takes an array of values and returns an array of values to update. Can be called multiple times. |
| `retryCount` | `number`                                                     | The number of times to retry the update function if the values change.                                           |

#### 📦 Return object

| Property  | Type      | Description                                            |
| --------- | --------- | ------------------------------------------------------ |
| `ok`      | `boolean` | Whether the update was successful.                     |
| `error`   | `string`  | The error message if the update failed or was aborted. |
| `values`  | `unknown` | The new values in Deno KV                              |

#### 📚 Complex example

```js
import { withSafeAtomics } from "https://deno.land/x/kvp/mod.ts";

// Create a KV instance with atomicMany support
const kv = withSafeAtomics(await Deno.openKv());

// Send 50 monies from Chad to Stacy
const { ok, error } = await kv.setSafeAtomicMany(
  [
    ["balance", "chad"],
    ["balance", "stacy"],
  ],
  (values, abort) => {
    const [chadBalance, stacyBalance] = values;

    if (chadBalance < 50) {
      // Oh no, Chad doesn't have enough money anymore. Abort!
      return abort("Chad has too little money to send 50 monies to Stacy.");
    }

    // Return array of updated values
    return [chadBalance - 50, stacyBalance + 50];
  },
);

if (ok) {
  console.log("Transaction successful!");
} else {
  console.log("Transaction failed:", error);
}
```

## 🌱 Contributing

I appreciate your contributions! Please open an issue first to discuss any changes before submitting a Pull Request to avoid disappointment. By opening an issue or Pull Request, you agree that the content is your own work and you grant an unlimited, non exclusive non revokable licence for your work to be used in this project.
