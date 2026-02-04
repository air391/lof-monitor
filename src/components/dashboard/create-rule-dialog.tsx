"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MonitorRule } from "@/lib/types"
import { X, Loader2 } from "lucide-react"
import { getApiUrl, fetchWithAuth } from "@/lib/api"

interface CreateRuleDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  funds: Array<{ code: string; name: string }>
  apiToken: string
}

export function CreateRuleDialog({ isOpen, onClose, onSuccess, funds, apiToken }: CreateRuleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    fundCode: "",
    fundName: "",
    premiumAbove: 2.0,
    amountAbove: 50,
    webhookUrl: "",
    webhookType: "wechat" as MonitorRule['notification']['webhookType'],
    throttleMinutes: 60
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!apiToken) {
      setError('请先设置API Token')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('http://localhost:8000/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Token': apiToken
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '创建规则失败')
      }

      onSuccess()
      onClose()
      
      // 重置表单
      setFormData({
        name: "",
        fundCode: "",
        fundName: "",
        premiumAbove: 2.0,
        amountAbove: 50,
        webhookUrl: "",
        webhookType: "wechat",
        throttleMinutes: 60
      })
    } catch (err: any) {
      setError(err.message || '创建规则失败')
    } finally {
      setLoading(false)
    }
  }

  const selectedFund = funds.find(f => f.code === formData.fundCode)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>新建监控规则</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                配置基金的溢价率监听规则，达到条件时自动发送Webhook通知
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 错误提示 */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* 规则名称 */}
            <div className="space-y-2">
              <Label htmlFor="name">规则名称 *</Label>
              <Input
                id="name"
                placeholder="例如：白酒基金溢价监控"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* 选择基金 */}
            <div className="space-y-2">
              <Label htmlFor="fundCode">选择基金 *</Label>
              <Select
                value={formData.fundCode}
                onValueChange={(value) => {
                  const fund = funds.find(f => f.code === value)
                  setFormData({
                    ...formData,
                    fundCode: value,
                    fundName: fund?.name || ""
                  })
                }}
                required
              >
                <SelectTrigger id="fundCode">
                  <SelectValue placeholder="搜索并选择基金" />
                </SelectTrigger>
                <SelectContent>
                  {funds.map((fund) => (
                    <SelectItem key={fund.code} value={fund.code}>
                      {fund.code} - {fund.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedFund && (
                <p className="text-xs text-muted-foreground">
                  已选择：{selectedFund.name}
                </p>
              )}
            </div>

            {/* 触发条件 */}
            <div className="space-y-4">
              <Label>触发条件 *</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="premiumAbove" className="text-sm text-muted-foreground">
                    溢价率 ≥ (%)
                  </Label>
                  <Input
                    id="premiumAbove"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.premiumAbove}
                    onChange={(e) => setFormData({ ...formData, premiumAbove: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amountAbove" className="text-sm text-muted-foreground">
                    成交额 ≥ (万元)
                  </Label>
                  <Input
                    id="amountAbove"
                    type="number"
                    step="1"
                    min="0"
                    value={formData.amountAbove}
                    onChange={(e) => setFormData({ ...formData, amountAbove: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                当溢价率和成交额同时达到条件时触发通知
              </p>
            </div>

            {/* Webhook通知 */}
            <div className="space-y-4">
              <Label>Webhook通知 *</Label>
              <div className="space-y-2">
                <Label htmlFor="webhookType" className="text-sm text-muted-foreground">
                  通知平台
                </Label>
                <Select
                  value={formData.webhookType}
                  onValueChange={(value: any) => setFormData({ ...formData, webhookType: value })}
                >
                  <SelectTrigger id="webhookType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wechat">企业微信</SelectItem>
                    <SelectItem value="dingtalk">钉钉</SelectItem>
                    <SelectItem value="feishu">飞书</SelectItem>
                    <SelectItem value="slack">Slack</SelectItem>
                    <SelectItem value="custom">自定义</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhookUrl" className="text-sm text-muted-foreground">
                  Webhook URL *
                </Label>
                <Input
                  id="webhookUrl"
                  type="url"
                  placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {formData.webhookType === 'wechat' && '在企业微信群聊中添加机器人，获取Webhook地址'}
                  {formData.webhookType === 'dingtalk' && '在钉钉群聊中添加自定义机器人，获取Webhook地址'}
                  {formData.webhookType === 'feishu' && '在飞书群聊中添加自定义机器人，获取Webhook地址'}
                  {formData.webhookType === 'slack' && '在Slack中创建Incoming Webhook'}
                  {formData.webhookType === 'custom' && '输入自定义的Webhook地址'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="throttleMinutes" className="text-sm text-muted-foreground">
                  限流时间（分钟）
                </Label>
                <Input
                  id="throttleMinutes"
                  type="number"
                  min="1"
                  max="1440"
                  value={formData.throttleMinutes}
                  onChange={(e) => setFormData({ ...formData, throttleMinutes: parseInt(e.target.value) || 60 })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  同一规则两次通知之间至少间隔的分钟数，避免频繁通知
                </p>
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                取消
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  '创建规则'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
