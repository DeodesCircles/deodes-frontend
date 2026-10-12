"use client";

import { useWsContext } from "@/providers/ws-provider";
import type { WsConnectionState } from "@/hooks/use-websocket";

export interface WsState {
  isConnected: boolean;
  connectionState: WsConnectionState;
}

/**
 * Returns the global WebSocket connection state from WsProvider without
 * opening a second connection. Safe to call from any client component
 * rendered inside <WsProvider>.
 */
export function useWsState(): WsState {
  const { isConnected, connectionState } = useWsContext();
  return { isConnected, connectionState };
}
