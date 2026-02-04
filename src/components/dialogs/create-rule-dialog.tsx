"use client"

import { useState } from "react"
import { MonitorRule } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CreateRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateRule: (rule: MonitorRule) => void
  funds: Array<{ code: string; name: string }>
}

export function CreateRuleDialog({ open, onOpenChange, onCreateRule, funds }: CreateRuleDialogProps) {
  const [ruleName, setRuleName] = useState("")
  const [selectedFund, setSelectedFund] = useState("")
  const [premiumAbove, setPremiumAbove] = useState("5")
  const [amountAbove, setAmountAbove] = useState("50")
  const [webhookType, setWebhookType] = useState<"wechat" | "dingtalk" | "feishu" | "slack" | "custom">("wechat")
  const [webhookUrl, setWebhookUrl] = useState("")
  const [throttleMinutes, setThrottleMinutes] = useState("30")

  const handleSubmit = () => {
    if (!selectedFund || !webhookUrl) {
      alert("请填写完整信息")
      return
    }

    const fund = funds.find(f => f.code === selectedFund)
    if (!fund) return

    const newRule: MonitorRule = {
      id: Date.now().toString(),
      name: ruleName,
      fundCode: fund.code,
      fundName: fund.name,
      enabled: true,
      condition: {
        premiumAbove: parseFloat(premiumAbove),
        premiumBelow: null,
        amountAbove: parseFloat(amountAbove) * 10000
      },
      notification: {
        webhookUrl,
        webhookType,
        throttleMinutes: parseInt(throttleMinutes)
      },
      createdAt: new Date().toISOString(),
      lastTriggered: null,
      triggerCount: 0
    }

    onCreateRule(newRule)
    onOpenChange(false)

    // 重置表单
    setRuleName("")
    setSelectedFund("")
    setPremiumAbove("5")
    setAmountAbove("50")
    setWebhookUrl("")
    setThrottleMinutes("30")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新建监控规则</DialogTitle>
          <DialogDescription>
            配置基金的溢价率监听规则，达到条件时自动发送Webhook通知
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 步骤1：选择基金 */}
          <div>
            <h3 className="text-sm font-semibold mb-3">步骤1：选择基金</h3>
            <Select value={selectedFund} onValueChange={setSelectedFund}>
              <SelectTrigger>
                <SelectValue placeholder="选择要监控的基金" />
              </SelectTrigger>
              <SelectContent>
                {funds.slice(0, 50).map(fund => (
                  <SelectItem key={fund.code} value={fund.code}>
                    {fund.code} - {fund.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 步骤2：设置触发条件 */}
          <div>
            <h3 className="text-sm font-semibold mb-3">步骤2：设置触发条件</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rule-name">规则名称</Label>
                <Input
                  id="rule-name"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="如：白酒5%预警"
                />
              </div>
              <div>
                <Label htmlFor="premium-above">溢价率 ≥ (%)</Label>
                <Input
                  id="premium-above"
                  type="number"
                  value={premiumAbove}
                  onChange={(e) => setPremiumAbove(e.target.value)}
                  min="0.5"
                  max="20"
                  step="0.5"
                />
              </div>
              <div>
                <Label htmlFor="amount-above">成交额 ≥ (万元)</Label>
                <Input
                  id="amount-above"
                  type="number"
                  value={amountAbove}
                  onChange={(e) => setAmountAbove(e.target.value)}
                  min="0"
                  step="10"
                />
              </div>
              <div>
                <Label htmlFor="throttle">限流时间（分钟）</Label>
                <Input
                  id="throttle"
                  type="number"
                  value={throttleMinutes}
                  onChange={(e) => setThrottleMinutes(e.target.value)}
                  min="5"
                  max="120"
                  step="5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  同一规则触发后，X分钟内不再重复通知
                </p>
              </div>
            </div>
          </div>

          {/* 步骤3：配置Webhook */}
          <div>
            <h3 className="text-sm font-semibold mb-3">步骤3：配置Webhook通知</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="webhook-type">Webhook类型</Label>
                <Select value={webhookType} onValueChange={(value: any) => setWebhookType(value)}>
                  <SelectTrigger>
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
              <div>
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {webhookType === "wechat" && "💡 企业微信机器人获取：群聊 → 添加机器人 → Webhook"}
                  {webhookType === "dingtalk" && "💡 钉钉机器人获取：群设置 → 智能群助手 → 自定义机器人"}
                </p>
              </div>
              <Button type="button" variant="outline" className="w-full">
                🧪 测试Webhook连接
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            ✅ 创建规则
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
