"use client"

import { Card, CardContent } from "@/components/ui/card"
import { formatPercent } from "@/lib/utils"
import { TrendingUp, TrendingDown, Activity, Target, Bell, BarChart3 } from "lucide-react"
import { DashboardStats } from "@/lib/types"

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  iconClass: string
  icon: React.ReactNode
}

function MetricCard({ title, value, subtitle, iconClass, icon }: MetricCardProps) {
  return (
    <Card className="card-hover border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={`stat-icon ${iconClass}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-xl font-bold tracking-tight mt-0.5">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface DashboardOverviewProps {
  stats: DashboardStats
}

export function DashboardOverview({ stats }: DashboardOverviewProps) {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      <MetricCard
        title="总LOF数量"
        value={stats.totalFunds}
        subtitle="实时监控"
        iconClass="stat-icon-blue"
        icon={<Activity className="h-5 w-5" />}
      />
      <MetricCard
        title="符合条件"
        value={stats.filteredFunds}
        subtitle={`占比 ${stats.totalFunds > 0 ? ((stats.filteredFunds / stats.totalFunds) * 100).toFixed(1) : 0}%`}
        iconClass="stat-icon-purple"
        icon={<Target className="h-5 w-5" />}
      />
      <MetricCard
        title="高溢价机会"
        value={stats.highPremiumFunds}
        subtitle="溢价率 ≥ 5%"
        iconClass="stat-icon-orange"
        icon={<TrendingUp className="h-5 w-5" />}
      />
      <MetricCard
        title="高折价机会"
        value={stats.highDiscountFunds}
        subtitle="折价率 ≤ -3%"
        iconClass="stat-icon-green"
        icon={<TrendingDown className="h-5 w-5" />}
      />
      <MetricCard
        title="最高溢价"
        value={formatPercent(stats.maxPremium)}
        iconClass="stat-icon-red"
        icon={<BarChart3 className="h-5 w-5" />}
      />
      <MetricCard
        title="监控规则"
        value={stats.totalRules}
        subtitle={`${stats.enabledRules} 条已启用`}
        iconClass="stat-icon-indigo"
        icon={<Bell className="h-5 w-5" />}
      />
    </div>
  )
}
