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
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 登录表单
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  
  // 注册表单
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [captchaId, setCaptchaId] = useState('')
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaImage, setCaptchaImage] = useState('')

  if (!isOpen) return null

  // 加载验证码
  const loadCaptcha = async () => {
    try {
      const response = await fetch(getApiUrl('/api/auth/captcha'))
      const data = await response.json()
      setCaptchaId(data.captcha_id)
      setCaptchaImage(data.image)
    } catch (err) {
      console.error('加载验证码失败:', err)
    }
  }

  // 切换到注册模式时加载验证码
  const handleSwitchToRegister = () => {
    setMode('register')
    setError(null)
    loadCaptcha()
  }

  // 登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('username', loginUsername)
      formData.append('password', loginPassword)

      const response = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || '登录失败')
      }

      // 保存Token和用户名
      onLoginSuccess(data.user.api_token, data.user.username)
      onClose()
      
      // 重置表单
      setLoginUsername('')
      setLoginPassword('')
    } catch (err: any) {
      setError(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  // 注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(getApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          email: regEmail || null,
          captcha_id: captchaId,
          captcha_code: captchaCode
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || '注册失败')
      }

      // 注册成功，自动登录
      onLoginSuccess(data.user.api_token, data.user.username)
      onClose()
      
      // 重置表单
      setRegUsername('')
      setRegPassword('')
      setRegEmail('')
      setCaptchaCode('')
    } catch (err: any) {
      setError(err.message || '注册失败')
      // 重新加载验证码
      loadCaptcha()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{mode === 'login' ? '登录' : '注册'}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* 登录表单 */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-username">用户名</Label>
                <Input
                  id="login-username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="login-password">密码</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                还没有账号？
                <Button
                  type="button"
                  variant="link"
                  className="ml-1 p-0 h-auto"
                  onClick={handleSwitchToRegister}
                >
                  立即注册
                </Button>
              </div>
            </form>
          ) : (
            /* 注册表单 */
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-username">用户名 *</Label>
                <Input
                  id="reg-username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reg-password">密码 *</Label>
                <Input
                  id="reg-password"
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">密码至少6位</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email">邮箱（可选）</Label>
                <Input
                  id="reg-email"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="captcha">验证码 *</Label>
                <div className="flex gap-2">
                  <Input
                    id="captcha"
                    value={captchaCode}
                    onChange={(e) => setCaptchaCode(e.target.value)}
                    required
                    placeholder="输入验证码"
                  />
                  {captchaImage && (
                    <img
                      src={captchaImage}
                      alt="验证码"
                      className="h-10 w-24 cursor-pointer rounded border"
                      onClick={loadCaptcha}
                      title="点击刷新"
                    />
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    注册中...
                  </>
                ) : (
                  '注册'
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                已有账号？
                <Button
                  type="button"
                  variant="link"
                  className="ml-1 p-0 h-auto"
                  onClick={() => {
                    setMode('login')
                    setError(null)
                  }}
                >
                  立即登录
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
