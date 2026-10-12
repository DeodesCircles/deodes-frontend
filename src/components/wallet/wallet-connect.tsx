"use client";

import { useState } from "react";
import { Wallet, WifiOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatAddress } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { useMultiWalletStore } from "@/stores/multi-wallet-store";
import { useMultiWalletConnection } from "@/hooks/use-multi-wallet";
import { useOnlineStatus } from "@/hooks/use-online-status";

interface WalletConnectProps {
  className?: string;
  variant?: "outline" | "primary";
  size?: "sm" | "md" | "lg";
}

export function WalletConnect({
  className,
  variant = "outline",
  size = "sm",
}: WalletConnectProps) {
  const isOnline = useOnlineStatus();
  const { isConnected, address, isConnecting, error } = useMultiWalletConnection();
  const connect = useMultiWalletStore((s) => s.connect);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLocalError(null);

    if (!isOnline) {
      setLocalError(
        "You are offline. Please check your internet connection and try again.",
      );
      return;
    }

    try {
      await connect("freighter");
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("not installed")) {
          setLocalError(
            "Freighter wallet is not installed. Please install the Freighter browser extension to continue.",
          );
        } else {
          setLocalError(err.message || "Failed to connect wallet.");
        }
      } else if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "network_offline"
      ) {
        setLocalError(
          "You are offline. Please check your internet connection and try again.",
        );
      } else {
        setLocalError("Failed to connect wallet.");
      }
    }
  };

  const displayError = localError || error;

  if (isConnected && address) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <Wallet className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
            {formatAddress(address)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {!isOnline && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-400">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>You&apos;re offline — connect when you&apos;re back online</span>
        </div>
      )}
      <Button
        variant={variant}
        size={size}
        leftIcon={<Wallet className="h-4 w-4" />}
        isLoading={isConnecting}
        disabled={!isOnline}
        onClick={handleConnect}
      >
        {isConnecting ? "Connecting..." : !isOnline ? "Offline" : "Connect Wallet"}
      </Button>
      {displayError && (
        <p className="text-xs text-red-600 dark:text-red-400 max-w-[240px]">
          {displayError}
        </p>
      )}
    </div>
  );
}

