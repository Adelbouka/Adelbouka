import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NAMESPACES } from "./messages";

type Tree = { [k: string]: string | Tree };
const load = (locale: string, ns: string): Tree =>
  JSON.parse(readFileSync(path.resolve(__dirname, `../../messages/${locale}/${ns}.json`), "utf8"));
const keys = (t: Tree, prefix = ""): string[] =>
  Object.entries(t).flatMap(([k, v]) => (typeof v === "string" ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`)));
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)[,}]/g)].map((m) => m[1]).sort();

describe("translations", () => {
  for (const ns of NAMESPACES) {
    it(`${ns}: Arabic and French define the same keys and placeholders`, () => {
      const ar = load("ar", ns);
      const fr = load("fr", ns);
      expect(keys(ar).sort()).toEqual(keys(fr).sort());
      const flat = (t: Tree) => Object.fromEntries(keys(t).map((k) => [k, k.split(".").reduce<Tree | string>((n, p) => (n as Tree)[p], t) as string]));
      const a = flat(ar), f = flat(fr);
      for (const k of Object.keys(f)) expect([k, placeholders(a[k])]).toEqual([k, placeholders(f[k])]);
    });
  }
  it("contains no empty strings", () => {
    for (const locale of ["ar", "fr"]) for (const ns of NAMESPACES) {
      const t = load(locale, ns);
      const empty = keys(t).filter((k) => !k.split(".").reduce<Tree | string>((n, p) => (n as Tree)[p], t));
      expect(empty, `${locale}/${ns}`).toEqual([]);
    }
  });
});
