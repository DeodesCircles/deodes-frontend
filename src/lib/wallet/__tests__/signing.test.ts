import { describe, it, expect } from "vitest"
import { createPasskeyAdapter } from "../adapters/passkey"

// The XDR sign-transaction flow was removed with the legacy chain (the
// server route is deleted). The adapter must refuse explicitly instead of
// failing obscurely — same precedent as the Arc adapter.
describe("passkey signTransaction — removed", () => {
  it("throws not_supported", async () => {
    const adapter = createPasskeyAdapter()
    await expect(adapter.signTransaction("AAAA")).rejects.toMatchObject({
      adapter: "passkey",
      code: "not_supported",
    })
  })
})
