"use client";

import { motion } from "framer-motion";
import { ArrowUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { cn } from "@/lib/cn";
import type { Currency } from "@/types";
import { CURRENCIES, SORT_OPTIONS, TYPE_TABS } from "./circles-filter-options";

interface CirclesFilterBarProps {
  typeFilter: string;
  onTypeChange: (value: string) => void;
  currencyFilter: Currency | null;
  onCurrencyChange: (value: Currency | null) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  openOnly: boolean;
  onOpenOnlyChange: (value: boolean) => void;
}

/** Type tabs + currency toggle + open-only switch + sort menu for /circles. */
export function CirclesFilterBar({
  typeFilter,
  onTypeChange,
  currencyFilter,
  onCurrencyChange,
  sortValue,
  onSortChange,
  openOnly,
  onOpenOnlyChange,
}: CirclesFilterBarProps) {
  const selectedSort = SORT_OPTIONS.find((s) => s.value === sortValue) ?? SORT_OPTIONS[0];

  return (
    <div className="p-4 rounded-xl border-l-4 border-l-aurora-violet bg-card/60 backdrop-blur-md space-y-3 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by circle type">
          {TYPE_TABS.map((f) => (
            <motion.button
              key={f.value}
              type="button"
              aria-pressed={typeFilter === f.value}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onTypeChange(f.value)}
              className={cn(
                "inline-flex items-center rounded-full px-4 py-1.5 text-xs font-body font-medium transition-all duration-300",
                typeFilter === f.value
                  ? "gradient-bg-extended text-white shadow-lg holo-glow"
                  : "glass-whisper text-muted-foreground hover:text-foreground dark:hover:text-white",
              )}
            >
              {f.label}
            </motion.button>
          ))}
          <motion.button
            type="button"
            aria-pressed={openOnly}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onOpenOnlyChange(!openOnly)}
            title="Show only circles a newcomer can join (pending/active)"
            className={cn(
              "inline-flex items-center rounded-full px-4 py-1.5 text-xs font-body font-medium transition-all duration-300",
              openOnly
                ? "gradient-bg-extended text-white shadow-lg holo-glow"
                : "glass-whisper text-muted-foreground hover:text-foreground dark:hover:text-white",
            )}
          >
            Open only
          </motion.button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xs text-muted-foreground font-body">Currency:</span>
            {CURRENCIES.map((c) => (
              <motion.button
                key={c}
                type="button"
                aria-pressed={currencyFilter === c}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onCurrencyChange(currencyFilter === c ? null : c)}
                className={cn(
                  "inline-flex items-center rounded-full px-3.5 py-1 text-xs font-body font-medium transition-all duration-300",
                  currencyFilter === c
                    ? "gradient-bg-extended text-white"
                    : "glass-whisper text-muted-foreground hover:text-foreground dark:hover:text-white",
                )}
              >
                {c}
              </motion.button>
            ))}
          </div>

          <Dropdown
            align="right"
            trigger={
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<ArrowUpDown className="h-3.5 w-3.5" />}
                className="font-body text-xs border-aurora-violet/30 hover:border-aurora-violet"
              >
                <span className="hidden sm:inline">Sort: </span>
                <span className="font-semibold text-aurora-violet dark:text-emerald-400">
                  {selectedSort.label}
                </span>
              </Button>
            }
          >
            <div className="py-1">
              <p className="px-3 py-1.5 text-[10px] tracking-wider uppercase text-muted-foreground font-heading border-b border-border/40">
                Sort Circles By
              </p>
              {SORT_OPTIONS.map((option) => {
                const isSelected = option.value === sortValue;
                return (
                  <DropdownItem
                    key={option.value}
                    role="menuitemradio"
                    aria-checked={isSelected}
                    onClick={() => onSortChange(option.value)}
                    className={cn(
                      "justify-between text-xs transition-colors",
                      isSelected
                        ? "bg-aurora-violet/15 text-aurora-violet font-semibold dark:text-emerald-400"
                        : "text-foreground/80 hover:bg-white/5",
                    )}
                  >
                    <span>{option.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-aurora-violet dark:text-emerald-400" />}
                  </DropdownItem>
                );
              })}
            </div>
          </Dropdown>
        </div>
      </div>
    </div>
  );
}
