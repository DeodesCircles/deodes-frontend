"use client"

import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/formatters"
import type { Circle } from "@/types"

interface CircleContributeModalProps {
  circle: Circle
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isSubmitting: boolean
  txnHash: string
  onTxnHashChange: (value: string) => void
  txnHashError?: string | null
}

export function CircleContributeModal({
  circle,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  txnHash,
  onTxnHashChange,
  txnHashError,
}: CircleContributeModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Contribution"
      description={`Contribute to ${circle.name} — USDC on Arc only`}
      size="sm"
      footer={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onConfirm}
            isLoading={isSubmitting}
          >
            Confirm &amp; Sign
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="rounded-xl border border-muted-foreground/15 p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-body">Amount</span>
          <span className="text-sm font-heading font-semibold text-foreground dark:text-white">
            {formatCurrency(circle.contributionAmount, circle.currency)}
          </span>
        </div>
        <div className="rounded-xl border border-muted-foreground/15 p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-body">Circle</span>
          <span className="text-sm font-heading font-semibold text-foreground dark:text-white">
            {circle.name}
          </span>
        </div>
        <div className="rounded-xl border border-muted-foreground/15 p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-body">Round</span>
          <span className="text-sm font-heading font-semibold text-foreground dark:text-white">
            {circle.currentRound}
          </span>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Arc transaction hash (0x…)</span>
          <input
            value={txnHash}
            onChange={(e) => onTxnHashChange(e.target.value)}
            placeholder="0x… — pay USDC on Arc, then paste the hash"
            spellCheck={false}
            aria-label="Arc transaction hash"
            className="w-full rounded-xl border border-muted-foreground/20 bg-transparent px-3 py-2 font-mono text-xs"
          />
        </label>
        {txnHashError && (
          <p role="alert" className="text-xs text-red-400">
            {txnHashError}
          </p>
        )}
        <p className="text-2xs text-muted-foreground">
          Sign the intent with your Arc (0x) wallet, pay USDC on Arc, then submit the transaction hash.
        </p>
      </div>
    </Modal>
  )
}
