import { NextResponse } from 'next/server'
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/api'

export async function GET() {
  try {
    // 调用远程Python后端API
    const apiUrl = `${API_BASE_URL}${API_ENDPOINTS.LOF_DATA}`

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Python后端返回错误')
    }

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    // 如果Python后端不可用，返回错误信息
    return NextResponse.json(
      { error: '无法连接到Python后端，请检查服务器是否正常运行' },
      { status: 503 }
    )
  }
}
