import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocaleSwitcher } from "../locale-switcher";

// Mock useTranslate so tests are independent of the real LocaleProvider
const mockSetLocale = vi.fn();
let mockLocale = "en";

vi.mock("@/lib/locale/context", () => ({
  useTranslate: () => ({
    locale: mockLocale,
    setLocale: mockSetLocale,
    t: (key: string) => key,
    fallbackLocale: null,
    retryLocale: vi.fn(),
    dismissFallbackNotice: vi.fn(),
  }),
}));

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocale = "en";
  });

  it("renders with the current locale code", () => {
    render(<LocaleSwitcher />);

    // The locale code should appear in the trigger (hidden on mobile, shown on sm+)
    const button = screen.getByRole("button", { name: /Language: English/i });
    expect(button).toBeInTheDocument();
    // The locale code text is present in the DOM
    expect(button.textContent).toMatch(/en/i);
  });

  it("shows the flag for the current locale", () => {
    render(<LocaleSwitcher />);
    const button = screen.getByRole("button", { name: /Language:/i });
    // English flag emoji
    expect(button.textContent).toContain("🇬🇧");
  });

  it("dropdown is not visible initially", () => {
    render(<LocaleSwitcher />);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("clicking the trigger opens the dropdown", () => {
    render(<LocaleSwitcher />);
    const trigger = screen.getByRole("button", { name: /Language:/i });
    fireEvent.click(trigger);

    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();
    // Should show all 15 language options
    const options = within(listbox).getAllByRole("option");
    expect(options).toHaveLength(15);
  });

  it("selecting a language calls setLocale with the correct value", () => {
    render(<LocaleSwitcher />);
    const trigger = screen.getByRole("button", { name: /Language:/i });
    fireEvent.click(trigger);

    const frOption = screen.getByRole("option", { name: /Français/i });
    fireEvent.click(frOption);

    expect(mockSetLocale).toHaveBeenCalledOnce();
    expect(mockSetLocale).toHaveBeenCalledWith("fr");
  });

  it("dropdown closes after selecting a language", () => {
    render(<LocaleSwitcher />);
    const trigger = screen.getByRole("button", { name: /Language:/i });
    fireEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    const esOption = screen.getByRole("option", { name: /Español/i });
    fireEvent.click(esOption);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("dropdown closes when clicking outside", () => {
    render(
      <div>
        <LocaleSwitcher />
        <div data-testid="outside">Outside</div>
      </div>,
    );

    const trigger = screen.getByRole("button", { name: /Language:/i });
    fireEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("marks the current locale option as selected", () => {
    render(<LocaleSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /Language:/i }));

    const enOption = screen.getByRole("option", { name: /English/i });
    expect(enOption).toHaveAttribute("aria-selected", "true");

    const frOption = screen.getByRole("option", { name: /Français/i });
    expect(frOption).toHaveAttribute("aria-selected", "false");
  });

  it("closes dropdown on Escape key", () => {
    render(<LocaleSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: /Language:/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
