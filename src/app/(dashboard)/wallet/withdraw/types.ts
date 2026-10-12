export type WithdrawStep = "wallet" | "amount" | "confirm" | "otp" | "success"

export interface WalletOption {
  id: string
  label: string
  balance: number
  asset: string
}

export interface BankOption {
  code: string
  name: string
}

export interface WithdrawQuote {
  estimatedNgn: number
  rate: number
  spread: number
  yellowCardAddress: string
  withdrawId: string
}
