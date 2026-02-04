export interface LOFFund {
  code: string
  name: string
  price: number
  nav: number | null
  navDate?: string
  premium: number | null
  amount: number
  change: number
  estimate?: number
  purchaseStatus?: 'open' | 'limited' | 'suspended'
}

export interface MonitorRule {
  id: string
  name: string
  fundCode: string
  fundName: string
  enabled: boolean
  condition: {
    premiumAbove: number | null
    premiumBelow: number | null
    amountAbove: number | null
  }
  notification: {
    webhookUrl: string
    webhookType: 'wechat' | 'dingtalk' | 'feishu' | 'slack' | 'custom'
    throttleMinutes: number
  }
  createdAt: string
  lastTriggered: string | null
  triggerCount: number
}

export interface NotificationHistory {
  id: string
  ruleId: string
  ruleName: string
  fundCode: string
  fundName: string
  triggeredAt: string
  premium: number
  webhookType: string
  status: 'success' | 'failed'
  errorMessage?: string
}

export interface DashboardStats {
  totalFunds: number
  filteredFunds: number
  highPremiumFunds: number
  highDiscountFunds: number
  maxPremium: number
  minPremium: number
  totalRules: number
  enabledRules: number
}

export interface FilterConfig {
  search: string
  minPremium: number | null
  maxPremium: number | null
  minAmount: number
  sortField: keyof LOFFund
  sortDirection: 'asc' | 'desc'
}
