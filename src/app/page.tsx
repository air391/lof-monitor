"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import { EnhancedFundTable } from "@/components/dashboard/enhanced-fund-table"
import { MonitorRules } from "@/components/dashboard/monitor-rules"
import { CreateRuleDialog } from "@/components/dashboard/create-rule-dialog"
import { AuthModal } from "@/components/auth/auth-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LOFFund, MonitorRule, DashboardStats } from "@/lib/types"
import {
  RefreshCw, Settings, Bell, Download, LogOut,
  TrendingUp, TrendingDown, BarChart3, Timer, Pause, Play
} from "lucide-react"
import Link from "next/link"
import { fetchWithAuth } from "@/lib/api"
import { cn } from "@/lib/utils"

type TabType = 'premium' | 'discount' | 'all'

export default function HomePage() {
  const [funds, setFunds] = useState<LOFFund[]>([])
  const [rules, setRules] = useState<MonitorRule[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('premium')
  const [showCreateRule, setShowCreateRule] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // 自动刷新
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30) // 秒
  const [countdown, setCountdown] = useState(30)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  // API Token和用户信息
  const [apiToken, setApiToken] = useState<string>("")
  const [username, setUsername] = useState<string>("")
  const [showAuthModal, setShowAuthModal] = useState(false)

  // 从localStorage加载Token和用户名
  useEffect(() => {
    const savedToken = localStorage.getItem('lof_api_token')
    const savedUsername = localStorage.getItem('lof_username')
    if (savedToken) setApiToken(savedToken)
    if (savedUsername) setUsername(savedUsername)
  }, [])

  // 登录成功回调
  const handleLoginSuccess = (token: string, user: string) => {
    setApiToken(token)
    setUsername(user)
    localStorage.setItem('lof_api_token', token)
    localStorage.setItem('lof_username', user)
    setShowAuthModal(false)
    loadRealData()
    loadRules()
  }

  // 退出登录
  const handleLogout = () => {
    setApiToken('')
    setUsername('')
    setRules([])
    localStorage.removeItem('lof_api_token')
    localStorage.removeItem('lof_username')
  }

  // 从真实API加载数据
  const loadRealData = useCallback(async () => {
    try {
      setError(null)
      const response = await fetchWithAuth('/api/lof-data')

      if (!response.ok) throw new Error('API请求失败')

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      const loadedFunds: LOFFund[] = data.funds.map((fund: any) => ({
        code: fund.code,
        name: fund.name,
        price: fund.price,
        nav: fund.nav,
        navDate: fund.nav_date,
        premium: fund.premium,
        amount: fund.amount,
        change: fund.change,
        estimate: fund.estimate,
        purchaseStatus: fund.purchase_status
      }))

      setFunds(loadedFunds)
      setLastUpdated(new Date())
    } catch (err: any) {
      setError(err.message || '加载数据失败')
      console.error('加载失败:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // 加载规则
  const loadRules = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/rules')
      if (response.ok) {
        const data = await response.json()
        setRules(data.rules || [])
      } else if (response.status === 401) {
        setRules([])
      }
    } catch (err) {
      console.error('加载规则失败:', err)
    }
  }, [])

  // 初始加载
  useEffect(() => {
    loadRealData()
    loadRules()
  }, [loadRealData, loadRules])

  // 自动刷新逻辑
  useEffect(() => {
    if (autoRefresh) {
      setCountdown(refreshInterval)

      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            loadRealData()
            return refreshInterval
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [autoRefresh, refreshInterval, loadRealData])

  const handleRefresh = async () => {
    setRefreshing(true)
    setCountdown(refreshInterval)
    await loadRealData()
  }

  const handleExportCSV = () => {
    const headers = ['代码', '名称', '场内价格', '基金净值', '溢价率(%)', '涨跌幅(%)', '成交额']
    const csvContent = [
      headers.join(','),
      ...funds.map(fund => [
        fund.code,
        `"${fund.name}"`,
        fund.price?.toFixed(3) || 'N/A',
        fund.nav?.toFixed(3) || 'N/A',
        fund.premium?.toFixed(2) || 'N/A',
        fund.change?.toFixed(2) || 'N/A',
        fund.amount
      ].join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `lof_data_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
  }

  // 计算统计数据
  const stats: DashboardStats = {
    totalFunds: funds.length,
    filteredFunds: funds.filter(f => f.premium !== null && f.premium >= 1.5 && f.amount >= 500000).length,
    highPremiumFunds: funds.filter(f => f.premium !== null && f.premium >= 5).length,
    highDiscountFunds: funds.filter(f => f.premium !== null && f.premium <= -3).length,
    maxPremium: funds.reduce((max, f) => Math.max(max, f.premium || -Infinity), -Infinity),
    minPremium: funds.reduce((min, f) => Math.min(min, f.premium || Infinity), Infinity),
    totalRules: rules.length,
    enabledRules: rules.filter(r => r.enabled).length
  }

  // 按tab筛选基金
  const getFilteredFunds = (tab: TabType) => {
    switch (tab) {
      case 'premium':
        return funds.filter(f => f.premium !== null && f.premium > 0)
      case 'discount':
        return funds.filter(f => f.premium !== null && f.premium < 0)
      default:
        return funds
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-muted animate-pulse mx-auto" />
            <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
          </div>
          <p className="text-sm text-muted-foreground">正在加载LOF基金数据...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4 max-w-md p-8">
          <div className="text-5xl">⚠️</div>
          <h2 className="text-xl font-semibold">无法连接到数据源</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            重新加载
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">LOF套利监控</h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {lastUpdated && (
                    <span className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {lastUpdated.toLocaleTimeString('zh-CN')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 自动刷新控制 */}
              <div className="flex items-center gap-1 mr-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={cn(
                    "h-8 px-2",
                    autoRefresh && "text-primary"
                  )}
                >
                  {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                {autoRefresh && (
                  <span className="text-xs text-muted-foreground w-8 text-center font-mono">
                    {countdown}s
                  </span>
                )}
              </div>

              {/* 登录/用户信息 */}
              {!apiToken ? (
                <Button variant="outline" size="sm" onClick={() => setShowAuthModal(true)}>
                  登录
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    {username}
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <Link href="/settings">
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Overview Cards */}
        <DashboardOverview stats={stats} />

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Left Column - Fund Table (3/4 width) */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-base font-semibold">套利机会</CardTitle>

                  {/* Tab切换 */}
                  <div className="flex gap-1 p-1 bg-muted/80 rounded-lg">
                    <Button
                      variant={activeTab === 'premium' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('premium')}
                      className={cn(
                        "h-7 px-3 text-xs",
                        activeTab === 'premium' && "shadow-sm"
                      )}
                    >
                      <TrendingUp className="h-3 w-3 mr-1.5" />
                      溢价 ({getFilteredFunds('premium').length})
                    </Button>
                    <Button
                      variant={activeTab === 'discount' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('discount')}
                      className={cn(
                        "h-7 px-3 text-xs",
                        activeTab === 'discount' && "shadow-sm"
                      )}
                    >
                      <TrendingDown className="h-3 w-3 mr-1.5" />
                      折价 ({getFilteredFunds('discount').length})
                    </Button>
                    <Button
                      variant={activeTab === 'all' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('all')}
                      className={cn(
                        "h-7 px-3 text-xs",
                        activeTab === 'all' && "shadow-sm"
                      )}
                    >
                      <BarChart3 className="h-3 w-3 mr-1.5" />
                      全部 ({funds.length})
                    </Button>
                  </div>
                </div>

                {/* Tab说明 */}
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary"></span>
                  {activeTab === 'premium' && '溢价套利：场外申购 → 场内卖出，赚取溢价差'}
                  {activeTab === 'discount' && '折价套利：场内买入 → 场外赎回，赚取折价差'}
                  {activeTab === 'all' && '显示所有LOF基金数据'}
                </p>
              </CardHeader>

              <CardContent>
                <EnhancedFundTable
                  funds={getFilteredFunds(activeTab)}
                  mode={activeTab}
                  pageSize={15}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Monitor Rules (1/4 width) */}
          <div className="space-y-4">
            <MonitorRules
              rules={rules}
              onRefresh={loadRules}
              onCreateRule={() => setShowCreateRule(true)}
              apiToken={apiToken}
            />

            {/* Quick Actions */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">快捷操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start h-9 text-sm"
                  onClick={handleExportCSV}
                >
                  <Download className="h-4 w-4 mr-2" />
                  导出CSV
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-9 text-sm"
                  disabled={!apiToken}
                  onClick={() => setShowCreateRule(true)}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  创建监控规则
                </Button>
              </CardContent>
            </Card>

            {/* 登录提示 */}
            {!apiToken && (
              <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="p-4">
                  <p className="text-sm text-foreground/80">
                    登录后可创建监控规则，实时推送套利机会
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setShowAuthModal(true)}
                  >
                    立即登录
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-8">
        <div className="container mx-auto px-4 py-4 text-center text-xs text-muted-foreground">
          <p>
            LOF基金数量：{funds.length} | 监控规则：{stats.totalRules} 条
            {autoRefresh && ` | 自动刷新：${refreshInterval}秒`}
          </p>
        </div>
      </footer>

      {/* Dialogs */}
      <CreateRuleDialog
        isOpen={showCreateRule}
        onClose={() => setShowCreateRule(false)}
        onSuccess={() => {
          loadRules()
          setShowCreateRule(false)
        }}
        funds={funds.map(f => ({ code: f.code, name: f.name }))}
        apiToken={apiToken}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  )
}
