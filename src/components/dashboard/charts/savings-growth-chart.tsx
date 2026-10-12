'use client'

import { useMemo, useState, useEffect } from 'react'
import { TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'

interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string | null
}

interface SavingsGrowthChartProps {
  goals: SavingsGoal[]
}

/**
 * Savings growth chart showing progress toward savings goals
 * Uses recharts if available, falls back to custom SVG visualization
 */
export function SavingsGrowthChart({ goals }: SavingsGrowthChartProps) {
  const [isClient, setIsClient] = useState(false)
  useEffect(() => { setIsClient(true) }, [])

  const chartData = useMemo(() => {
    return goals
      .filter((g) => g.targetAmount > 0)
      .map((goal) => ({
        name: goal.name,
        current: goal.currentAmount,
        target: goal.targetAmount,
        percentage: Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)),
      }))
  }, [goals])

  if (!isClient || chartData.length === 0) {
    return (
      <div className="glass rounded-2xl p-5 holo-border">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-aurora-violet" />
          <h3 className="font-heading text-sm font-semibold text-foreground">Savings Progress</h3>
        </div>
        <div className="py-8 text-center space-y-2">
          <p className="text-xs text-muted-foreground font-body">No savings goals yet</p>
          <p className="text-2xs text-muted-foreground">Create a savings goal to track your progress</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-5 holo-border">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-aurora-violet" />
        <h3 className="font-heading text-sm font-semibold text-foreground">Savings Progress</h3>
      </div>

      <div className="space-y-4">
        {chartData.map((item) => (
          <div key={item.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
              <p className="text-sm font-bold gradient-text">{item.percentage}%</p>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-aurora-violet to-aurora-indigo rounded-full transition-all duration-500"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-2xs text-muted-foreground">
              <span>{formatCurrency(item.current, 'USDC')}</span>
              <span>{formatCurrency(item.target, 'USDC')}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xs text-muted-foreground uppercase tracking-wide">Total Saved</p>
            <p className="font-heading text-lg font-bold gradient-text">
              {formatCurrency(chartData.reduce((sum, item) => sum + item.current, 0), 'USDC')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xs text-muted-foreground uppercase tracking-wide">Total Goal</p>
            <p className="font-heading text-lg font-bold text-foreground">
              {formatCurrency(chartData.reduce((sum, item) => sum + item.target, 0), 'USDC')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
