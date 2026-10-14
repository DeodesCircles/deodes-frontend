"use client";

import { useMemo, useState } from "react";
import { DollarSign, TriangleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { useMultiWallet } from "@/hooks/use-multi-wallet";
import { useContribute } from "@/hooks/use-circles";
import { LiveRegion } from "@/components/shared/live-region";
import {
  buildContributionIntentMessage,
  validateArcTxHash,
  validateContributeInput,
} from "@/lib/contributions/validation";
import { sendArcUSDCTransfer } from "@/lib/contributions/arc-transfer";
import { getErrorMessage } from "@/lib/api-client";

type ContributionPhase = "idle" | "signing" | "paying" | "submitting" | "success" | "error";

interface CircleContributeFormProps {
  circleId: string;
  circleName: string;
  contributionAmount: number;
  currency: string;
  roundNumber?: number;
  treasuryAddress?: string;
  isPremium?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CircleContributeForm({
  circleId,
  circleName,
  contributionAmount,
  currency,
  roundNumber = 1,
  treasuryAddress,
  isPremium = false,
  onSuccess,
  onCancel,
}: CircleContributeFormProps) {
  const { address: publicKey, signMessage } = useMultiWallet();
  const contribute = useContribute(circleId);
  const [txnHashInput, setTxnHashInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<ContributionPhase>("idle");
  const isLoading = contribute.isPending || phase === "signing" || phase === "paying" || phase === "submitting";

  const handleSubmit = async () => {
    setError(null);
    const preflight = validateContributeInput({
      amount: contributionAmount,
      currency,
      walletAddress: publicKey ?? "",
      roundNumber,
      expectedAmount: contributionAmount,
      isPremium,
    });
    if (preflight) {
      setError(preflight);
      setPhase("error");
      return;
    }
    if (!publicKey) {
      setError("No wallet connected. Please connect a wallet first.");
      setPhase("error");
      return;
    }
    try {
      setPhase("signing");
      const message = buildContributionIntentMessage({
        amount: contributionAmount,
        circleName,
        circleId,
        roundNumber,
        walletAddress: publicKey,
      });
      await signMessage(message);

      let txnHash = txnHashInput.trim();
      if (!txnHash && treasuryAddress) {
        setPhase("paying");
        txnHash = await sendArcUSDCTransfer({ from: publicKey, to: treasuryAddress, amount: contributionAmount });
        setTxnHashInput(txnHash);
      }
      const hashError = validateArcTxHash(txnHash);
      if (hashError) {
        setError(treasuryAddress ? hashError : `${hashError} Paste the Arc transaction hash from your wallet payment.`);
        setPhase("error");
        return;
      }
      setPhase("submitting");
      await contribute.mutateAsync({ amount: contributionAmount, roundNumber, txnHash });
      setPhase("success");
      onSuccess?.();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setPhase("error");
    }
  };

  const statusMessage = useMemo(() => {
    switch (phase) {
      case "signing":
        return "Waiting for wallet signature…";
      case "paying":
        return "Sending USDC on Arc — confirm in your wallet…";
      case "submitting":
        return "Recording your contribution…";
      case "success":
        return `Contribution of ${formatCurrency(contributionAmount, currency)} to ${circleName} confirmed.`;
      case "error":
        return error ?? "Failed to process contribution.";
      default:
        return "";
    }
  }, [phase, error, contributionAmount, currency, circleName]);

  return (
    <div className="space-y-4">
      <LiveRegion message={statusMessage} />
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900">{circleName}</h4>
            <p className="text-sm text-gray-500">Round {roundNumber} · USDC on Arc only</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Your contribution:</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(contributionAmount, currency)}</span>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
            <DollarSign className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              You are about to contribute <strong>{formatCurrency(contributionAmount, currency)}</strong> to{" "}
              <strong>{circleName}</strong> on Arc. Sign the intent, pay USDC, then submit the Arc transaction hash.
            </p>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-gray-700">Arc transaction hash (0x…)</span>
            <input
              value={txnHashInput}
              onChange={(e) => setTxnHashInput(e.target.value)}
              placeholder="0x…"
              spellCheck={false}
              className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs"
              aria-label="Arc transaction hash"
            />
          </label>
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="md" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="primary" size="md" onClick={handleSubmit} isLoading={isLoading} leftIcon={<DollarSign className="h-4 w-4" />}>
          Confirm &amp; Sign
        </Button>
      </div>
    </div>
  );
}
