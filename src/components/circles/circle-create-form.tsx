"use client";

import CreateCircleWizard from "@/components/circles/create-circle-wizard";
import type { CreateCircleInput } from "@/lib/validators";

interface CircleCreateFormProps {
  onSubmit?: (data: CreateCircleInput) => void;
  isPending?: boolean;
}

export function CircleCreateForm({ onSubmit, isPending }: CircleCreateFormProps) {
  return <CreateCircleWizard onSubmit={onSubmit} isPending={isPending} />;
}
