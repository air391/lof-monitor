"use client"

import { useState } from "react"
import { LOFFund } from "@/lib/types"
import { formatCurrency, formatPercent, formatAmount } from "@/lib/utils"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"

interface FundTableProps {
  funds: LOFFund[]
  title?: string
}

export function FundTable({ funds, title }: FundTableProps) {
  const [sortField, setSortField] = useState<keyof LOFFund>('premium')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const sortedFunds = [...funds].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]

    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    }

    return 0
  })

  const handleSort = (field: keyof LOFFund) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getPremiumClass = (premium: number | null) => {
    if (premium === null) return ""
    if (premium >= 5) return "bg-orange-500/10 text-orange-500"
    if (premium >= 2) return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500"
    return ""
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h3 className="text-lg font-semibold">{title || `LOF基金列表 (${funds.length})`}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="cursor-pointer hover:text-foreground/80" onClick={() => handleSort('code')}>
                代码
              </th>
              <th className="cursor-pointer hover:text-foreground/80" onClick={() => handleSort('name')}>
                名称
              </th>
              <th className="cursor-pointer hover:text-foreground/80 text-right" onClick={() => handleSort('price')}>
                场内价格
              </th>
              <th className="cursor-pointer hover:text-foreground/80 text-right" onClick={() => handleSort('nav')}>
                基金净值
              </th>
              <th className="cursor-pointer hover:text-foreground/80 text-right" onClick={() => handleSort('premium')}>
                溢价率
              </th>
              <th className="cursor-pointer hover:text-foreground/80 text-right" onClick={() => handleSort('change')}>
                涨跌幅
              </th>
              <th className="cursor-pointer hover:text-foreground/80 text-right" onClick={() => handleSort('amount')}>
                成交额
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedFunds.map((fund) => (
              <tr key={fund.code} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                <td className="font-mono text-sm">{fund.code}</td>
                <td className="font-medium">{fund.name}</td>
                <td className="text-right font-mono">{formatCurrency(fund.price)}</td>
                <td className="text-right font-mono text-muted-foreground">
                  {fund.nav ? formatCurrency(fund.nav) : 'N/A'}
                </td>
                <td className={`text-right font-mono font-medium ${getPremiumClass(fund.premium)}`}>
                  {fund.premium !== null ? formatPercent(fund.premium) : 'N/A'}
                </td>
                <td className="text-right font-mono">
                  <span className={`inline-flex items-center gap-1 ${fund.change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {fund.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(fund.change)}%
                  </span>
                </td>
                <td className="text-right font-mono text-muted-foreground">
                  {formatAmount(fund.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
