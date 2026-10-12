"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { DollarSign, Clock, Shield, Users, RotateCw, Hash } from "lucide-react"
import { useListMotion } from "@/lib/motion/list"
import { formatCurrency } from "@/lib/formatters"
import type { Circle, CircleMember } from "@/types"

const cardItem = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1 },
}

interface StatCard {
  label: string
  value: string
  icon: ReactNode
}

function GlassStatCard({ label, value, icon }: StatCard) {
  return (
    <motion.div
      variants={cardItem}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="glass rounded-2xl p-5 tilt-hover depth-2"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-aurora-violet/20 to-aurora-indigo/20">
          <span className="gradient-text">{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="text-2xs tracking-wider uppercase text-muted-foreground font-body">
            {label}
          </p>
          <p className="font-heading text-xl font-bold text-foreground dark:text-white truncate">
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

interface CircleStatCardsProps {
  circle: Circle
  members: CircleMember[]
  isMember: boolean
  currentUserId?: string
}

export function CircleStatCards({
  circle,
  members,
  isMember,
  currentUserId,
}: CircleStatCardsProps) {
  const freqLabel =
    circle.frequency.charAt(0).toUpperCase() + circle.frequency.slice(1)

  const cards: StatCard[] = [
    {
      label: "Contribution",
      value: formatCurrency(circle.contributionAmount, circle.currency),
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      label: "Frequency",
      value: freqLabel,
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: "Payout Type",
      value:
        circle.payoutType.charAt(0).toUpperCase() + circle.payoutType.slice(1),
      icon: <Shield className="h-4 w-4" />,
    },
    {
      label: "Members",
      value: `${circle.memberCount ?? members.length}/${circle.maxMembers}`,
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: "Current Round",
      value: `Round ${circle.currentRound}/${circle.maxMembers}`,
      icon: <RotateCw className="h-4 w-4" />,
    },
    {
      label: "Your Position",
      value: isMember
        ? `#${members.find((m) => m.userId === currentUserId)?.position ?? "—"}`
        : "Not a member",
      icon: <Hash className="h-4 w-4" />,
    },
  ]

  const { shouldReduce, variants } = useListMotion(cards.length)

  return (
    <motion.div
      variants={variants}
      initial={shouldReduce ? undefined : "hidden"}
      animate={shouldReduce ? undefined : "show"}
      className="grid grid-cols-2 md:grid-cols-3 gap-4"
    >
      {cards.map((card) => (
        <GlassStatCard
          key={card.label}
          label={card.label}
          value={card.value}
          icon={card.icon}
        />
      ))}
    </motion.div>
  )
}
