"""
LOF基金API服务器 - 独立版本
为Next.js前端提供REST API
"""

import os
# 禁用所有代理（强制直连东方财富）
os.environ['HTTP_PROXY'] = ''
os.environ['HTTPS_PROXY'] = ''
os.environ['http_proxy'] = ''
os.environ['https_proxy'] = ''
os.environ['NO_PROXY'] = '*.eastmoney.com,push2.eastmoney.com,fundf10.eastmoney.com,emdata.eastmoney.com,localhost,127.0.0.1'
os.environ['no_proxy'] = '*.eastmoney.com,push2.eastmoney.com,fundf10.eastmoney.com,emdata.eastmoney.com,localhost,127.0.0.1'

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import uvicorn
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("已禁用所有代理，将直连东方财富API")

app = FastAPI(title="LOF基金监控API", version="2.0.0")

# 配置CORS - 允许所有来源
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("🚀 LOF基金API服务器启动中...")

@app.get("/")
async def root():
    """健康检查"""
    return {
        "status": "ok",
        "message": "LOF基金监控API服务运行中",
        "version": "2.0.0",
        "endpoints": {
            "lof_data": "/api/lof-data",
            "rules": "/api/rules",
            "health": "/"
        }
    }

@app.get("/api/lof-data")
async def get_lof_data():
    """获取LOF基金数据（含溢价率）"""
    try:
        # 导入数据获取模块
        import sys
        import os
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        
        from app import get_lof_spot_data, get_all_nav_data, merge_and_calculate, configure_proxy, ensure_cache_dir
        import pandas as pd
        
        # 配置代理和缓存
        configure_proxy()
        ensure_cache_dir()
        
        logger.info("正在获取LOF场内实时行情...")
        spot_df = get_lof_spot_data()
        
        if spot_df is None:
            return JSONResponse(
                {"error": "无法获取LOF场内行情数据，请检查网络连接（可能需要关闭Clash代理）"},
                status_code=500
            )
        
        logger.info(f"成功获取 {len(spot_df)} 只基金场内行情")
        
        # 获取净值数据
        fund_codes = spot_df['基金代码'].tolist()
        logger.info(f"开始获取 {len(fund_codes)} 只基金的净值...")
        nav_data = get_all_nav_data(fund_codes)
        
        # 合并数据并计算溢价率
        merged_df = merge_and_calculate(spot_df, nav_data)
        
        # 转换为JSON格式
        funds = []
        for _, row in merged_df.iterrows():
            price_val = row.get('场内价格')
            nav_val = row.get('基金净值')
            premium_val = row.get('溢价率(%)')
            amount_val = row.get('场内成交额')
            change_val = row.get('涨跌幅', 0)
            
            funds.append({
                "code": str(row['基金代码']),
                "name": str(row['基金名称']),
                "price": float(price_val) if pd.notna(price_val) else None,
                "nav": float(nav_val) if pd.notna(nav_val) else None,
                "premium": float(premium_val) if pd.notna(premium_val) else None,
                "amount": float(amount_val) if pd.notna(amount_val) else 0,
                "change": float(change_val) if pd.notna(change_val) else 0,
            })
        
        logger.info(f"✅ 成功返回 {len(funds)} 只LOF基金数据")
        
        return {
            "total": len(funds),
            "funds": funds,
            "updated_at": pd.Timestamp.now().isoformat()
        }
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        logger.error(f"获取数据失败: {error_msg}")
        logger.error(traceback.format_exc())
        
        return JSONResponse(
            {
                "error": f"获取数据失败: {error_msg}",
                "traceback": traceback.format_exc(),
                "hint": "请检查网络连接，可能需要关闭Clash代理"
            },
            status_code=500
        )

@app.get("/api/rules")
async def get_rules():
    """获取所有监控规则"""
    try:
        import sys
        import os
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from monitor_engine import load_rules
        
        rules = load_rules()
        return {"rules": rules}
    except Exception as e:
        return JSONResponse(
            {"error": f"获取规则失败: {str(e)}"},
            status_code=500
        )

class RuleCreate(BaseModel):
    name: str
    fundCode: str
    fundName: str
    premiumAbove: float
    amountAbove: float
    webhookUrl: str
    webhookType: str
    throttleMinutes: int

@app.post("/api/rules")
async def create_rule_endpoint(rule: RuleCreate):
    """创建新规则"""
    try:
        import sys
        import os
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from monitor_engine import create_rule
        
        rule_data = {
            'rule_name': rule.name,
            'fund_code': rule.fundCode,
            'fund_name': rule.fundName,
            'condition': {
                'premium_above': rule.premiumAbove,
                'amount_above': rule.amountAbove
            },
            'notification': {
                'webhook_url': rule.webhookUrl,
                'webhook_type': rule.webhookType,
                'throttle_minutes': rule.throttleMinutes
            }
        }
        
        new_rule = create_rule(rule_data)
        return {"rule": new_rule, "message": "规则创建成功"}
    except Exception as e:
        return JSONResponse(
            {"error": f"创建规则失败: {str(e)}"},
            status_code=500
        )

@app.delete("/api/rules/{rule_id}")
async def delete_rule_endpoint(rule_id: str):
    """删除规则"""
    try:
        import sys
        import os
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from monitor_engine import delete_rule
        
        success = delete_rule(rule_id)
        if success:
            return {"message": "规则删除成功"}
        else:
            return JSONResponse(
                {"error": "规则不存在"},
                status_code=404
            )
    except Exception as e:
        return JSONResponse(
            {"error": f"删除规则失败: {str(e)}"},
            status_code=500
        )

@app.post("/api/rules/{rule_id}/toggle")
async def toggle_rule_endpoint(rule_id: str):
    """切换规则启用/禁用状态"""
    try:
        import sys
        import os
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from monitor_engine import toggle_rule
        
        rule = toggle_rule(rule_id)
        if rule:
            return {"rule": rule, "message": "规则状态已更新"}
        else:
            return JSONResponse(
                {"error": "规则不存在"},
                status_code=404
            )
    except Exception as e:
        return JSONResponse(
            {"error": f"更新规则失败: {str(e)}"},
            status_code=500
        )

if __name__ == "__main__":
    print("""
    🚀 LOF基金监控API服务器启动中...
    
    访问地址：
    - 本地: http://localhost:8000
    - 文档: http://localhost:8000/docs
    - 健康检查: http://localhost:8000/
    
    API端点：
    - GET  /api/lof-data       获取LOF数据（390只基金）
    - GET  /api/rules          获取监控规则
    - POST /api/rules          创建规则
    - DELETE /api/rules/{id}   删除规则
    - POST /api/rules/{id}/toggle  切换规则状态
    
    前端访问：http://localhost:3001
    """)
    
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
