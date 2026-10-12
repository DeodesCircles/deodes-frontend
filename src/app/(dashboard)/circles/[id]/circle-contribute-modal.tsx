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
}

export function CircleContributeModal({
  circle,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
}: CircleContributeModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Contribution"
      description={`Contribute to ${circle.name}`}
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
        <div className="glass-whisper rounded-xl p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-body">Amount</span>
          <span className="text-sm font-heading font-semibold text-foreground dark:text-white">
            {formatCurrency(circle.contributionAmount, circle.currency)}
          </span>
        </div>
        <div className="glass-whisper rounded-xl p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-body">Circle</span>
          <span className="text-sm font-heading font-semibold text-foreground dark:text-white">
            {circle.name}
          </span>
        </div>
        <div className="glass-whisper rounded-xl p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-body">Round</span>
          <span className="text-sm font-heading font-semibold text-foreground dark:text-white">
            {circle.currentRound}
          </span>
        </div>
        <p className="text-2xs text-muted-foreground">
          This will open your connected wallet for transaction signing.
        </p>
      </div>
    </Modal>
  )
}
