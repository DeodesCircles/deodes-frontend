"use client"

import React from "react"

import { Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { CircleFormData } from "@/types"

interface CreateStepDetailsProps {
  formData: CircleFormData
  setFormData: React.Dispatch<React.SetStateAction<CircleFormData>>
  errors: Record<string, string>
}

export function CreateStepDetails({ formData, setFormData, errors }: CreateStepDetailsProps) {

  return (
    <div className="space-y-6">
      <h3 className="font-heading text-lg font-semibold text-foreground dark:text-white">
        Circle Details
      </h3>
      <div className="space-y-4">
        <Input
          label="Circle Name"
          placeholder="e.g., Neighborhood Savings Circle"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          error={errors.name}
        />
        <Input
          label="Description (optional)"
          placeholder="Briefly describe the purpose of this circle"
          value={formData.description ?? ""}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
        />
      </div>



      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Max Members"
          type="number"
          min={2}
          max={100}
          value={String(formData.maxMembers)}
          onChange={(e) => setFormData((prev) => ({ ...prev, maxMembers: Number(e.target.value) }))}
          error={errors.maxMembers}
        />
        <Input
          label="Start Date"
          type="datetime-local"
          value={formData.startDate}
          onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
          leftIcon={<Calendar className="h-4 w-4" />}
        />
      </div>
    </div>
  )
}
