# Test Data

This file includes some test data

## Example Error Snippet

```ts
// types.ts
export type File = {
  name: string;
};
```

```ts
// logic.ts
import { File } from "./types.js";

const file: File = {
  text: "Hello World!",
};
```

```ts
import { File } from "./test.js";

const file: File = {
  name: "string",
  text: "Hello World!",
};
```
