import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPercent(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A'
  return `${value.toFixed(decimals)}%`
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A'
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 3
  }).format(value)
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A'
  return new Intl.NumberFormat('zh-CN').format(value)
}

export function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A'
  const wan = value / 10000
  if (wan >= 1) {
    return `${wan.toFixed(0)}万`
  }
  return formatNumber(value)
}
