import { describe, expect, it } from "vitest"

import { fmtY } from "./format"

describe("fmtY chart value formatting", () => {
  it("formats currency compactly", () => {
    expect(fmtY(1_200_000, "currency")).toBe("£1.2m")
    expect(fmtY(340_000, "currency")).toBe("£340k")
    expect(fmtY(950, "currency")).toBe("£950")
  })

  it("keeps the sign on negatives (variance/decline data)", () => {
    expect(fmtY(-40_000, "currency")).toBe("-£40k")
    expect(fmtY(-2.5, "percent")).toBe("-2.5%")
  })

  it("formats percentages", () => {
    expect(fmtY(12, "percent")).toBe("12%")
    expect(fmtY(12.34, "percent")).toBe("12.3%")
  })

  it("formats plain numbers compactly", () => {
    expect(fmtY(1_234, "number")).toBe("1.2k")
    expect(fmtY(42, "number")).toBe("42")
  })
})
