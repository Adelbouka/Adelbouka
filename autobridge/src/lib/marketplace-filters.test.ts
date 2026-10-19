import { describe, expect, it } from "vitest";
import { activeFilterCount, filtersToSearch, parseFilters } from "./marketplace-filters";
import { safeNextPath } from "./utils";

describe("marketplace filters", () => {
  it("parses and sanitizes query parameters", () => {
    const f = parseFilters({ make: "volkswagen", yearMin: "2020", priceMax: "4000000", fuel: "diesel", sort: "price_asc", page: "2", verified: "1" });
    expect(f).toMatchObject({ make: "volkswagen", yearMin: 2020, priceMax: 4_000_000, fuel: "diesel", sort: "price_asc", page: 2, verified: true, availability: "available" });
  });
  it("drops invalid values instead of failing", () => {
    const f = parseFilters({ make: "VW; drop", yearMin: "abc", fuel: "steam", sort: "nope", country: "germany", availability: "x" });
    expect(f.make).toBeUndefined();
    expect(f.yearMin).toBeUndefined();
    expect(f.fuel).toBeUndefined();
    expect(f.country).toBeUndefined();
    expect(f.sort).toBe("newest");
    expect(f.availability).toBe("available");
    expect(activeFilterCount(f)).toBe(0);
  });
  it("round-trips to a minimal query string", () => {
    const f = parseFilters({ make: "kia", page: "1", sort: "newest" });
    expect(filtersToSearch(f)).toBe("?make=kia");
    expect(filtersToSearch({ ...f, page: 3 })).toBe("?make=kia&page=3");
  });
});

describe("safeNextPath", () => {
  it("allows same-site relative paths only", () => {
    expect(safeNextPath("/fr/account", "/x")).toBe("/fr/account");
    expect(safeNextPath("//evil.example", "/x")).toBe("/x");
    expect(safeNextPath("https://evil.example", "/x")).toBe("/x");
    expect(safeNextPath("/\\evil.example", "/x")).toBe("/x");
    expect(safeNextPath(null, "/x")).toBe("/x");
  });
});
