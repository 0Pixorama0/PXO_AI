/* Stamps a version onto every local asset URL.

   No-build ES modules are cached hard by the browser, and a stale main.js or
   components.css has produced several false "still broken" reports. serve.py
   sends no-store for new requests, but entries already in the cache survive.
   Changing the URL is the only thing that reliably defeats both.

   Run after editing anything under app/ or styles.css:

       node stamp.mjs
*/

import { readFileSync, writeFileSync } from "node:fs";

const V = Date.now().toString(36);

/** Replace ?v=… on a relative path, or add it. */
const stamp = (src, re) =>
  src.replace(re, (m, pre, path, post) => `${pre}${path.split("?")[0]}?v=${V}${post}`);

const files = {
  "index.html": [
    /(<link rel="stylesheet" href=")(\.\/[^"]+)(")/g,
    /(<script type="module" src=")(\.\/[^"]+)(")/g,
  ],
  "styles.css": [/(@import url\(")(\.\/[^"]+)("\))/g],
  "app/main.js": [/(from ")(\.\/[^"]+\.js)(")/g],
  "app/ui.js": [/(from ")(\.\/[^"]+\.js)(")/g],
  "app/views-core.js": [/(from ")(\.\/[^"]+\.js)(")/g],
  "app/views-admin.js": [/(from ")(\.\/[^"]+\.js)(")/g],
};

let touched = 0;
for (const [file, patterns] of Object.entries(files)) {
  let src = readFileSync(file, "utf8");
  const before = src;
  for (const re of patterns) src = stamp(src, re);
  if (src !== before) {
    writeFileSync(file, src);
    touched++;
  }
}

console.log(`stamped ${touched} files with v=${V}`);
