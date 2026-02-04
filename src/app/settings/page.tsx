"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">设置</h1>
              <p className="text-sm text-muted-foreground mt-1">
                配置应用参数和偏好设置
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* 筛选条件 */}
          <Card>
            <CardHeader>
              <CardTitle>默认筛选条件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">最小溢价率 (%)</label>
                <input
                  type="number"
                  defaultValue="1.5"
                  step="0.1"
                  min="0"
                  max="10"
                  className="mt-1 w-full h-10 px-3 rounded-md border bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium">最小成交额 (万元)</label>
                <input
                  type="number"
                  defaultValue="50"
                  step="10"
                  min="0"
                  max="500"
                  className="mt-1 w-full h-10 px-3 rounded-md border bg-background"
                />
              </div>
            </CardContent>
          </Card>

          {/* 自动刷新 */}
          <Card>
            <CardHeader>
              <CardTitle>数据刷新</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">自动刷新间隔</label>
                <select className="mt-1 w-full h-10 px-3 rounded-md border bg-background">
                  <option value="0">关闭</option>
                  <option value="30">30秒</option>
                  <option value="60">1分钟</option>
                  <option value="300">5分钟</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* 缓存管理 */}
          <Card>
            <CardHeader>
              <CardTitle>缓存管理</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                清除缓存后，下次加载将重新获取所有基金数据。
              </p>
              <Button variant="outline" className="w-full">
                清除今日缓存
              </Button>
            </CardContent>
          </Card>

          {/* 主题设置 */}
          <Card>
            <CardHeader>
              <CardTitle>外观</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1">
                  🌙 深色模式
                </Button>
                <Button variant="outline" className="flex-1">
                  ☀️ 浅色模式
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 关于 */}
          <Card>
            <CardHeader>
              <CardTitle>关于</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>版本</strong>：2.0.0</p>
                <p><strong>技术栈</strong>：Next.js 15 + TypeScript + shadcn/ui</p>
                <p><strong>数据来源</strong>：东方财富网（Akshare）</p>
                <p className="text-muted-foreground mt-4">
                  本应用仅供学习研究使用，不构成投资建议。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
