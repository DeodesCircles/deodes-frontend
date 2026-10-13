import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnrampWidget, openOnrampPopup } from "./onramp-widget";

const mountIframe = vi.fn();
const openWindow = vi.fn();
const fetchSession = vi.fn();

vi.mock("@circle-fin/app-kit", () => ({
  AppKit: vi.fn(function (this: unknown) {
    return {
      onramp: { fetchSession, mountIframe, openWindow },
    };
  }),
}));

const ARC_ADDR = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

describe("OnrampWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mountIframe.mockReturnValue({ close: vi.fn() });
  });

  it("refuses a non-0x destination before any network call", async () => {
    const onError = vi.fn();
    render(
      <OnrampWidget appUserId="user-1" destinationAddress="GABC123" onError={onError} />,
    );
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(fetchSession).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it("mints a session scoped to USDC on Arc and mounts the iframe", async () => {
    const onSettled = vi.fn();
    const settledCalls: Array<{ payload: unknown }> = [];
    mountIframe.mockImplementation(
      (opts: {
        onDepositSettled: (arg: { payload: unknown }) => void;
      }) => {
        settledCalls.push({ payload: null });
        opts.onDepositSettled({ payload: { paymentId: "pay-1" } });
        return { close: vi.fn() };
      },
    );
    fetchSession.mockResolvedValue({ sessionToken: "sess-test" });

    render(
      <OnrampWidget
        appUserId="user-1"
        destinationAddress={ARC_ADDR}
        onSettled={onSettled}
      />,
    );

    await waitFor(() => expect(fetchSession).toHaveBeenCalled());
    expect(fetchSession).toHaveBeenCalledWith({
      url: "/api/onramp/sessions",
      body: {
        appUserId: "user-1",
        destinationAddress: ARC_ADDR,
        assets: { tokens: ["USDC"], chains: ["arc"] },
      },
    });
    expect(mountIframe).toHaveBeenCalled();
    expect(settledCalls).toHaveLength(1);
    expect(onSettled).toHaveBeenCalledWith({ paymentId: "pay-1" });
  });

  it("popup helper returns blocked when the browser blocks it", async () => {
    fetchSession.mockResolvedValue({ sessionToken: "sess-test" });
    openWindow.mockResolvedValue({ status: "blocked", reason: "popup", errorMessage: "x" });
    await expect(
      openOnrampPopup({ appUserId: "user-1", destinationAddress: ARC_ADDR }),
    ).resolves.toBe("blocked");
  });
});
