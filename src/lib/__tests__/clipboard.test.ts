import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { copyToClipboard } from "@/lib/clipboard";

describe("copyToClipboard", () => {
  const originalClipboard = navigator.clipboard;
  const originalExecCommand = document.execCommand;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
    document.execCommand = originalExecCommand;
  });

  it("uses navigator.clipboard.writeText when available and successful", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const result = await copyToClipboard("hello world");
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith("hello world");
  });

  it("falls back to document.execCommand when navigator.clipboard fails", async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const execCommandMock = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    const result = await copyToClipboard("hello world");
    expect(result).toBe(true);
    expect(execCommandMock).toHaveBeenCalledWith("copy");
  });

  it("falls back to document.execCommand when navigator.clipboard is undefined", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const execCommandMock = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    const result = await copyToClipboard("fallback text");
    expect(result).toBe(true);
    expect(execCommandMock).toHaveBeenCalledWith("copy");
  });

  it("returns false if both clipboard API and execCommand fail", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    document.execCommand = vi.fn().mockImplementation(() => {
      throw new Error("execCommand failed");
    });

    const result = await copyToClipboard("failed text");
    expect(result).toBe(false);
  });
});
