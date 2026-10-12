"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import type { CircleMember } from "@/types"

const PREVIEW_LIMIT = 10

interface CircleMembersPreviewProps {
  members: CircleMember[]
}

export function CircleMembersPreview({ members }: CircleMembersPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasOverflow = members.length > PREVIEW_LIMIT
  const visibleMembers = isExpanded ? members : members.slice(0, PREVIEW_LIMIT)

  return (
    <div className="glass rounded-2xl p-5">
      <p className="mb-4 font-heading text-xl font-bold text-foreground dark:text-white">
        {members.length} members
      </p>

      {members.length > 0 ? (
        <div className="flex items-center gap-2 flex-wrap">
          {visibleMembers.map((member) => (
            <motion.div
              key={member.id}
              whileHover={{ scale: 1.1, y: -2 }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-aurora-violet/30 to-aurora-indigo/30 text-xs font-heading font-semibold text-foreground dark:text-white cursor-default"
              title={member.userName ?? member.userId}
            >
              {(member.userName ?? member.userId).slice(0, 2).toUpperCase()}
            </motion.div>
          ))}
          {hasOverflow && (
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded((expanded) => !expanded)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? "Show less" : `+${members.length - PREVIEW_LIMIT} more`}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No members yet.</p>
      )}
    </div>
  )
}
