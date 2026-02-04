"use client"

import { useState, useMemo, useCallback } from "react"
import { LOFFund, FilterConfig } from "@/lib/types"
import { formatCurrency, formatPercent, formatAmount, cn } from "@/lib/utils"
import {
  ArrowUpRight, ArrowDownRight, Search, ChevronUp, ChevronDown,
  Calculator, X, Filter, ChevronLeft, ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface EnhancedFundTableProps {
  funds: LOFFund[]
  mode: 'premium' | 'discount' | 'all'
  pageSize?: number
}

// 溢价率颜色渐变 - 使用CSS类
function getPremiumClass(premium: number | null): string {
  if (premium === null) return ""

  if (premium < 0) {
    // 折价：绿色系
    const absVal = Math.abs(premium)
    if (absVal >= 8) return "discount-extreme"
    if (absVal >= 5) return "discount-high"
    if (absVal >= 3) return "discount-medium"
    return ""
  } else {
    // 溢价：橙红色系
    if (premium >= 10) return "premium-extreme"
    if (premium >= 5) return "premium-high"
    if (premium >= 2) return "premium-medium"
    return ""
  }
}

// 收益计算器组件
function ProfitCalculator({ fund, onClose }: { fund: LOFFund; onClose: () => void }) {
  const [investAmount, setInvestAmount] = useState<string>("10000")

  const calculation = useMemo(() => {
    const amount = parseFloat(investAmount) || 0
    if (!fund.nav || !fund.premium) return null

    const purchaseFee = 0.015 // 申购费1.5%
    const sellFee = 0.001 // 卖出佣金0.1%
    const actualInvest = amount * (1 - purchaseFee)
    const shares = actualInvest / fund.nav
    const sellValue = shares * fund.price * (1 - sellFee)
    const profit = sellValue - amount
    const profitRate = (profit / amount) * 100

    return {
      shares: shares.toFixed(2),
      sellValue: sellValue.toFixed(2),
      profit: profit.toFixed(2),
      profitRate: profitRate.toFixed(2),
      fees: (amount * purchaseFee + shares * fund.price * sellFee).toFixed(2)
    }
  }, [investAmount, fund])

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-72 p-4 bg-card border rounded-lg shadow-lg animate-fadeIn">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm">收益计算器</h4>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">投入金额（元）</label>
          <Input
            type="number"
            value={investAmount}
            onChange={(e) => setInvestAmount(e.target.value)}
            className="h-8 mt-1"
          />
        </div>

        {calculation && (
          <div className="space-y-2 pt-2 border-t text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">可获份额</span>
              <span className="font-mono">{calculation.shares}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">卖出金额</span>
              <span className="font-mono">¥{calculation.sellValue}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">手续费</span>
              <span className="font-mono text-muted-foreground">¥{calculation.fees}</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-medium">
              <span>预估收益</span>
              <span className={cn(
                "font-mono",
                parseFloat(calculation.profit) >= 0 ? "text-red-500" : "text-green-500"
              )}>
                {parseFloat(calculation.profit) >= 0 ? '+' : ''}¥{calculation.profit}
                <span className="text-xs ml-1">({calculation.profitRate}%)</span>
              </span>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          * 按申购费1.5%、卖出佣金0.1%估算，实际以券商为准
        </p>
      </div>
    </div>
  )
}

export function EnhancedFundTable({ funds, mode, pageSize = 20 }: EnhancedFundTableProps) {
  const [filter, setFilter] = useState<FilterConfig>({
    search: '',
    minPremium: null,
    maxPremium: null,
    minAmount: 0,
    sortField: 'premium',
    sortDirection: mode === 'discount' ? 'asc' : 'desc'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [calculatorFund, setCalculatorFund] = useState<LOFFund | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // 筛选和排序
  const processedFunds = useMemo(() => {
    let result = [...funds]

    // 搜索过滤
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      result = result.filter(f =>
        f.code.includes(filter.search) ||
        f.name.toLowerCase().includes(searchLower)
      )
    }

    // 溢价率范围过滤
    if (filter.minPremium !== null) {
      result = result.filter(f => f.premium !== null && f.premium >= filter.minPremium!)
    }
    if (filter.maxPremium !== null) {
      result = result.filter(f => f.premium !== null && f.premium <= filter.maxPremium!)
    }

    // 成交额过滤
    if (filter.minAmount > 0) {
      result = result.filter(f => f.amount >= filter.minAmount)
    }

    // 排序
    result.sort((a, b) => {
      const aValue = a[filter.sortField]
      const bValue = b[filter.sortField]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return filter.sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return filter.sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return 0
    })

    return result
  }, [funds, filter])

  // 分页
  const totalPages = Math.ceil(processedFunds.length / pageSize)
  const paginatedFunds = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return processedFunds.slice(start, start + pageSize)
  }, [processedFunds, currentPage, pageSize])

  // 重置页码当筛选变化时
  const updateFilter = useCallback((updates: Partial<FilterConfig>) => {
    setFilter(prev => ({ ...prev, ...updates }))
    setCurrentPage(1)
  }, [])

  const handleSort = (field: keyof LOFFund) => {
    if (filter.sortField === field) {
      updateFilter({ sortDirection: filter.sortDirection === 'asc' ? 'desc' : 'asc' })
    } else {
      updateFilter({ sortField: field, sortDirection: 'desc' })
    }
  }

  const SortIcon = ({ field }: { field: keyof LOFFund }) => {
    if (filter.sortField !== field) return null
    return filter.sortDirection === 'asc'
      ? <ChevronUp className="h-3 w-3 inline ml-1" />
      : <ChevronDown className="h-3 w-3 inline ml-1" />
  }

  return (
    <div className="space-y-4">
      {/* 搜索和筛选栏 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索基金代码或名称..."
            value={filter.search}
            onChange={(e) => updateFilter({ search: e.target.value })}
            className="pl-9"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(showFilters && "bg-accent")}
        >
          <Filter className="h-4 w-4 mr-2" />
          筛选
        </Button>
      </div>

      {/* 高级筛选 */}
      {showFilters && (
        <div className="p-4 bg-muted/50 rounded-lg space-y-3 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {mode === 'discount' ? '最大折价率' : '最小溢价率'} (%)
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder={mode === 'discount' ? '-10' : '1.5'}
                value={filter.minPremium ?? ''}
                onChange={(e) => updateFilter({
                  minPremium: e.target.value ? parseFloat(e.target.value) : null
                })}
                className="h-8"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {mode === 'discount' ? '最小折价率' : '最大溢价率'} (%)
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder={mode === 'discount' ? '-1' : '20'}
                value={filter.maxPremium ?? ''}
                onChange={(e) => updateFilter({
                  maxPremium: e.target.value ? parseFloat(e.target.value) : null
                })}
                className="h-8"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">最小成交额（万）</label>
              <Input
                type="number"
                step="10"
                placeholder="50"
                value={filter.minAmount ? filter.minAmount / 10000 : ''}
                onChange={(e) => updateFilter({
                  minAmount: e.target.value ? parseFloat(e.target.value) * 10000 : 0
                })}
                className="h-8"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateFilter({
                search: '',
                minPremium: null,
                maxPremium: null,
                minAmount: 0
              })}
            >
              重置筛选
            </Button>
          </div>
        </div>
      )}

      {/* 结果统计 */}
      <div className="text-sm text-muted-foreground">
        共 {processedFunds.length} 只基金
        {filter.search && ` · 搜索: "${filter.search}"`}
      </div>

      {/* 表格 */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b">
                <th
                  className="cursor-pointer hover:text-foreground/80 select-none"
                  onClick={() => handleSort('code')}
                >
                  代码 <SortIcon field="code" />
                </th>
                <th
                  className="cursor-pointer hover:text-foreground/80 select-none"
                  onClick={() => handleSort('name')}
                >
                  名称 <SortIcon field="name" />
                </th>
                <th
                  className="cursor-pointer hover:text-foreground/80 text-right select-none"
                  onClick={() => handleSort('price')}
                >
                  场内价格 <SortIcon field="price" />
                </th>
                <th
                  className="cursor-pointer hover:text-foreground/80 text-right select-none"
                  onClick={() => handleSort('nav')}
                >
                  基金净值 <SortIcon field="nav" />
                </th>
                <th
                  className="cursor-pointer hover:text-foreground/80 text-right select-none"
                  onClick={() => handleSort('premium')}
                >
                  {mode === 'discount' ? '折价率' : '溢价率'} <SortIcon field="premium" />
                </th>
                <th
                  className="cursor-pointer hover:text-foreground/80 text-right select-none"
                  onClick={() => handleSort('change')}
                >
                  涨跌幅 <SortIcon field="change" />
                </th>
                <th
                  className="cursor-pointer hover:text-foreground/80 text-right select-none"
                  onClick={() => handleSort('amount')}
                >
                  成交额 <SortIcon field="amount" />
                </th>
                <th className="text-center w-12">操作</th>
              </tr>
            </thead>
            <tbody>
              {paginatedFunds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    没有符合条件的基金
                  </td>
                </tr>
              ) : (
                paginatedFunds.map((fund) => (
                  <tr
                    key={fund.code}
                    className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="font-mono text-sm">{fund.code}</td>
                    <td className="font-medium">
                      <div className="flex items-center gap-2">
                        {fund.name}
                        {fund.purchaseStatus === 'suspended' && (
                          <span className="text-xs px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded">
                            暂停申购
                          </span>
                        )}
                        {fund.purchaseStatus === 'limited' && (
                          <span className="text-xs px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded">
                            限购
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-right font-mono">{formatCurrency(fund.price)}</td>
                    <td className="text-right font-mono text-muted-foreground">
                      <div>
                        {fund.nav ? formatCurrency(fund.nav) : 'N/A'}
                        {fund.navDate && (
                          <div className="text-xs text-muted-foreground/60">{fund.navDate}</div>
                        )}
                      </div>
                    </td>
                    <td className={cn(
                      "text-right font-mono font-medium px-2 py-1 rounded",
                      getPremiumClass(fund.premium)
                    )}>
                      {fund.premium !== null ? formatPercent(fund.premium) : 'N/A'}
                    </td>
                    <td className="text-right font-mono">
                      <span className={fund.change >= 0 ? 'text-up' : 'text-down'}>
                        {fund.change >= 0
                          ? <ArrowUpRight className="h-3 w-3 inline mr-0.5" />
                          : <ArrowDownRight className="h-3 w-3 inline mr-0.5" />
                        }
                        {Math.abs(fund.change).toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-right font-mono text-muted-foreground">
                      {formatAmount(fund.amount)}
                    </td>
                    <td className="text-center relative">
                      <button
                        onClick={() => setCalculatorFund(calculatorFund?.code === fund.code ? null : fund)}
                        className={cn(
                          "p-1.5 rounded hover:bg-muted transition-colors",
                          calculatorFund?.code === fund.code && "bg-muted"
                        )}
                        title="收益计算器"
                      >
                        <Calculator className="h-4 w-4" />
                      </button>
                      {calculatorFund?.code === fund.code && (
                        <ProfitCalculator
                          fund={fund}
                          onClose={() => setCalculatorFund(null)}
                        />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            第 {currentPage} / {totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* 页码按钮 */}
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
