import { existsSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) {
    return nextResolve(specifier, context);
  }

  const base = specifier.startsWith("@/")
    ? pathToFileURL(join(process.cwd(), specifier.slice(2))).href
    : new URL(specifier, context.parentURL).href;

  const path = fileURLToPath(base);
  const candidates = extname(path)
    ? [path]
    : [`${path}.ts`, `${path}.js`, join(path, "index.ts")];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }

  return nextResolve(specifier, context);
}
