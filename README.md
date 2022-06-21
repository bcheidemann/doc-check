# 📚 DocCheck

DocCheck is a command line tool for type checking your markdown documentation so your code snippets will never go out of date.

## How does it work?

DocCheck uses the typescript compiler API to check your markdown code snippets. Code snippets are treated as though they are a part of your project, so you can import from files in your project. In fact, you can even import from other code snippets!

```ts
// src/examples/file1.ts

export const SomeCode = `

  The first comment line indicates to DocCheck
  that the snippet should be treated as a file
  existing at "src/examples/file1.ts".

`;
```

```ts
import { SomeCode } from "./src/examples/file1.js";

console.log(SomeCode);

/*

  By default, the file path of a code snippet
  will be:

    [MARKDOWN_FILE].[SNIPPET_INDEX].[EXTENSION]

  Where,
    MARKDOWN_FILE   is the file path of the
                    containing markdown file
    SNIPPET_INDEX   is the index of the snippet
                    in the markdown file, starting
                    at 0
    EXTENSION       is the extension for the
                    language used (e.g. ts)
  
  In this case, the file path would be:

    README.md.1.ts

*/
```

```ts
// src/examples/file2.ts

/*

  You can also use DocCheck as a library!

*/

import { Project } from "../../lib/project.js";

const project = new Project();
const { code } = project.checkMarkdownSync();
process.exit(code);

```

## How to use DocCheck?

It's recommended that you setup DocCheck as part of your build pipeline. You can also integrate it with husky.

## Warning 🔥

DocCheck is still experimental. Some things may not work as expected! 
