"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { getApiUrl } from "@/lib/api"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess: (token: string, username: string) => void
}

export function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) {
      setError('请输入 API Token')
      return
    }
    setLoading(true)
    setError(null)

    try {
      // 用 token 调用规则接口验证是否有效
      const response = await fetch(getApiUrl('/api/rules'), {
        headers: { 'Authorization': 'Bearer ' + token.trim() },
      })

      if (response.status === 401) {
        throw new Error('Token 无效，请检查后重试')
      }
      if (!response.ok) {
        throw new Error('验证失败，请检查后端服务是否正常运行')
      }

      onLoginSuccess(token.trim(), '已认证')
      setToken('')
      onClose()
    } catch (err: any) {
      setError(err.message || '验证失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>输入 API Token</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-token">API Token</Label>
              <Input
                id="api-token"
                type="password"
                placeholder="输入部署时配置的 API_TOKEN"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                autoComplete="current-password"
              />
              <p className="text-xs text-muted-foreground">
                通过 docker-compose 的 <code>API_TOKEN</code> 环境变量设置
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  验证中...
                </>
              ) : (
                '确认'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
