// 模拟数据生成器
import { LOFFund, MonitorRule, DashboardStats } from './types'

export function generateMockFunds(count: number = 390): LOFFund[] {
  const funds: LOFFund[] = []
  
  // 更真实的LOF基金名称
  const baseNames = [
    '招商中证白酒', '易方达原油', '国泰生物医药', '华宝油气', '广发纳斯达克',
    '华夏科创50', '南方中证500', '嘉实沪深300', '华泰柏瑞红利', '汇添富消费',
    '富国中证煤炭', '鹏华中证银行', '华宝中证医疗', '国泰中证钢铁', '广发中证全指',
    '博时中证银行', '华夏中证5G', '国泰中证全指', '华泰柏瑞300', '嘉实中证400',
    '南方中证证券', '华宝中证科技', '广发中证医药', '易方达恒生', '华夏恒生科技',
    '国泰中证地产', '华宝中证军工', '富国中证医药', '博时自然资源', '鹏华中证国防',
    '南方中证新能源', '华泰柏瑞500', '嘉实中证红利', '汇添富中证', '广发中证环保'
  ]

  for (let i = 0; i < count; i++) {
    const nav = 0.8 + Math.random() * 0.4
    // 让更多基金有溢价，方便演示
    const premium = (Math.random() - 0.2) * 18 // -3.6% to 14.4%
    const price = nav * (1 + premium / 100)

    // 生成更真实的基金代码
    const codeNum = 161000 + i
    const code = String(codeNum)

    funds.push({
      code: code,
      name: baseNames[i % baseNames.length],
      price: Number(price.toFixed(3)),
      nav: Number(nav.toFixed(3)),
      premium: Number(premium.toFixed(2)),
      amount: Math.floor(Math.random() * 10000000), // 更大的成交额范围
      change: Number(((Math.random() - 0.5) * 10).toFixed(2)),
      estimate: Number((nav * (1 + (Math.random() - 0.5) * 0.02)).toFixed(3))
    })
  }

  return funds
}

export function generateMockRules(): MonitorRule[] {
  return [
    {
      id: '1',
      name: '白酒5%预警',
      fundCode: '161725',
      fundName: '招商中证白酒',
      enabled: true,
      condition: {
        premiumAbove: 5,
        premiumBelow: null,
        amountAbove: 500000
      },
      notification: {
        webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
        webhookType: 'wechat',
        throttleMinutes: 30
      },
      createdAt: new Date().toISOString(),
      lastTriggered: null,
      triggerCount: 0
    },
    {
      id: '2',
      name: '原油套利',
      fundCode: '162411',
      fundName: '易方达原油',
      enabled: true,
      condition: {
        premiumAbove: 3,
        premiumBelow: null,
        amountAbove: 100000
      },
      notification: {
        webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
        webhookType: 'dingtalk',
        throttleMinutes: 60
      },
      createdAt: new Date().toISOString(),
      lastTriggered: null,
      triggerCount: 0
    }
  ]
}

export function calculateStats(
  funds: LOFFund[],
  filteredFunds: LOFFund[],
  rules: MonitorRule[]
): DashboardStats {
  return {
    totalFunds: funds.length,
    filteredFunds: filteredFunds.length,
    highPremiumFunds: filteredFunds.filter(f => f.premium && f.premium >= 5).length,
    highDiscountFunds: funds.filter(f => f.premium !== null && f.premium <= -3).length,
    maxPremium: filteredFunds.reduce((max, f) => Math.max(max, f.premium || 0), 0),
    minPremium: funds.reduce((min, f) => Math.min(min, f.premium || 0), 0),
    totalRules: rules.length,
    enabledRules: rules.filter(r => r.enabled).length
  }
}
