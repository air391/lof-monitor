"use client"

import { MonitorRule } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, BellOff, Plus, Trash2, Edit } from "lucide-react"

interface MonitorRulesProps {
  rules: MonitorRule[]
  onRefresh: () => void
  onCreateRule: () => void
  apiToken: string
}

export function MonitorRules({ rules, onRefresh, onCreateRule, apiToken }: MonitorRulesProps) {
  
  const handleToggleRule = async (ruleId: string) => {
    if (!apiToken) {
      alert('请先设置API Token')
      return
    }
    
    try {
      const response = await fetch(`http://localhost:8000/api/rules/${ruleId}/toggle`, {
        method: 'POST',
        headers: {
          'X-API-Token': apiToken
        }
      })
      
      if (response.ok) {
        onRefresh()
      } else {
        alert('切换规则状态失败')
      }
    } catch (err) {
      alert('切换规则状态失败')
    }
  }

  const handleDeleteRule = async (ruleId: string, ruleName: string) => {
    if (!confirm(`确定删除规则 "${ruleName}" 吗？`)) {
      return
    }
    
    if (!apiToken) {
      alert('请先设置API Token')
      return
    }
    
    try {
      const response = await fetch(`http://localhost:8000/api/rules/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'X-API-Token': apiToken
        }
      })
      
      if (response.ok) {
        onRefresh()
      } else {
        alert('删除规则失败')
      }
    } catch (err) {
      alert('删除规则失败')
    }
  }

  const getWebhookTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      wechat: '企业微信',
      dingtalk: '钉钉',
      feishu: '飞书',
      slack: 'Slack',
      custom: '自定义'
    }
    return labels[type] || type
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>监控规则</CardTitle>
          <Button size="sm" onClick={onCreateRule}>
            <Plus className="h-4 w-4 mr-1" />
            新建规则
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>还没有创建任何监控规则</p>
            <p className="text-sm mt-2">
              {apiToken ? '点击上方按钮创建第一条规则' : '请先设置API Token'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-lg border p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{rule.name}</h4>
                      <span className={`inline-flex items-center gap-1 text-xs ${rule.enabled ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {rule.enabled ? '● 已启用' : '○ 已禁用'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {rule.fundName} ({rule.fundCode})
                    </p>
                    <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                      <span>溢价率 ≥ {rule.condition.premiumAbove}%</span>
                      {rule.condition.amountAbove && (
                        <>
                          <span>•</span>
                          <span>成交额 ≥ {(rule.condition.amountAbove / 10000).toFixed(0)}万</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{getWebhookTypeLabel(rule.notification.webhookType)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggleRule(rule.id)}
                      title={rule.enabled ? '禁用' : '启用'}
                    >
                      {rule.enabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => alert('编辑功能开发中')}
                      title="编辑"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteRule(rule.id, rule.name)}
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
