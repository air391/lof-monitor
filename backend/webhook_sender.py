"""
Webhook发送器 - 支持多个平台的Webhook通知
"""

import logging
import requests
from datetime import datetime

logger = logging.getLogger(__name__)


def format_notification_message(notification, template_type="premium_alert"):
    """
    格式化通知消息
    """
    fund_data = notification['fund_data']
    rule = notification['rule']
    
    premium_rate = fund_data.get('溢价率(%)', 0)
    fund_name = fund_data.get('基金名称', '未知')
    fund_code = fund_data.get('基金代码', '')
    price = fund_data.get('场内价格', 0)
    nav = fund_data.get('基金净值', 0)
    amount = fund_data.get('场内成交额', 0)
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # 判断模板类型
    if premium_rate >= 8:
        template_type = "high_premium_alert"
    
    if template_type == "high_premium_alert":
        # 高溢价模板
        title = f"🚨 超高溢价套利机会！"
        content = f"""## {title}

**{fund_name}** ({fund_code})
溢价率高达 **{premium_rate:.2f}%**！

📊 当前数据:
• 场内价格: {price:.3f} 元
• 基金净值: {nav:.3f} 元
• 成交额: {amount/10000:.0f} 万元

⚡ 立即关注，机会难得！

⏰ {timestamp}
"""
    else:
        # 标准模板
        title = f"🍗 LOF套利机会提醒"
        content = f"""## {title}

**基金名称**: {fund_name}
**基金代码**: {fund_code}

📊 **当前数据**:
• 溢价率: **{premium_rate:.2f}%**
• 场内价格: {price:.3f} 元
• 基金净值: {nav:.3f} 元
• 成交额: {amount/10000:.0f} 万元

⏰ {timestamp}

💡 规则: {rule['rule_name']}
"""
    
    return title, content


def send_wechat_webhook(url, message):
    """
    发送企业微信机器人通知
    """
    try:
        title, content = message
        
        payload = {
            "msgtype": "markdown",
            "markdown": {
                "content": content
            }
        }
        
        response = requests.post(url, json=payload, timeout=10)
        result = response.json()
        
        if result.get('errcode') == 0:
            logger.info("企业微信通知发送成功")
            return True, None
        else:
            error_msg = result.get('errmsg', '未知错误')
            logger.error(f"企业微信通知发送失败: {error_msg}")
            return False, error_msg
            
    except Exception as e:
        logger.error(f"企业微信通知发送异常: {e}")
        return False, str(e)


def send_dingtalk_webhook(url, message):
    """
    发送钉钉机器人通知
    """
    try:
        title, content = message
        
        payload = {
            "msgtype": "markdown",
            "markdown": {
                "title": title,
                "text": content
            }
        }
        
        response = requests.post(url, json=payload, timeout=10)
        result = response.json()
        
        if result.get('errcode') == 0:
            logger.info("钉钉通知发送成功")
            return True, None
        else:
            error_msg = result.get('errmsg', '未知错误')
            logger.error(f"钉钉通知发送失败: {error_msg}")
            return False, error_msg
            
    except Exception as e:
        logger.error(f"钉钉通知发送异常: {e}")
        return False, str(e)


def send_feishu_webhook(url, message):
    """
    发送飞书机器人通知
    """
    try:
        title, content = message
        
        payload = {
            "msg_type": "post",
            "content": {
                "post": {
                    "zh_cn": {
                        "title": title,
                        "content": [
                            [{
                                "tag": "text",
                                "text": content
                            }]
                        ]
                    }
                }
            }
        }
        
        response = requests.post(url, json=payload, timeout=10)
        result = response.json()
        
        if result.get('code') == 0:
            logger.info("飞书通知发送成功")
            return True, None
        else:
            error_msg = result.get('msg', '未知错误')
            logger.error(f"飞书通知发送失败: {error_msg}")
            return False, error_msg
            
    except Exception as e:
        logger.error(f"飞书通知发送异常: {e}")
        return False, str(e)


def send_slack_webhook(url, message):
    """
    发送Slack通知
    """
    try:
        title, content = message
        
        # Slack使用纯文本，需要清理markdown格式
        clean_content = content.replace('**', '').replace('##', '').replace('•', '-').replace('💡', '').replace('⏰', '').replace('📊', '')
        
        payload = {
            "text": f"{title}\n{clean_content}",
            "username": "LOF Monitor Bot",
            "icon_emoji": ":chart_with_upwards_trend:"
        }
        
        response = requests.post(url, json=payload, timeout=10)
        
        if response.status_code == 200:
            logger.info("Slack通知发送成功")
            return True, None
        else:
            logger.error(f"Slack通知发送失败: {response.text}")
            return False, response.text
            
    except Exception as e:
        logger.error(f"Slack通知发送异常: {e}")
        return False, str(e)


def send_custom_webhook(url, message):
    """
    发送自定义Webhook通知（POST JSON格式）
    """
    try:
        title, content = message
        
        # 构造标准JSON格式
        payload = {
            "title": title,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "fund_data": message['fund_data'] if isinstance(message, dict) else {}
        }
        
        response = requests.post(url, json=payload, timeout=10)
        
        if response.status_code == 200:
            logger.info("自定义Webhook通知发送成功")
            return True, None
        else:
            error_msg = f"HTTP {response.status_code}: {response.text}"
            logger.error(f"自定义Webhook通知发送失败: {error_msg}")
            return False, error_msg
            
    except Exception as e:
        logger.error(f"自定义Webhook通知发送异常: {e}")
        return False, str(e)


def send_webhook_notification(notification):
    """
    发送Webhook通知（统一入口）
    """
    rule = notification['rule']
    webhook_config = rule.get('notification', {})
    webhook_url = webhook_config.get('webhook_url', '')
    webhook_type = webhook_config.get('webhook_type', 'custom')
    
    if not webhook_url:
        logger.error("Webhook URL为空，无法发送通知")
        return False, "Webhook URL为空"
    
    # 格式化消息
    message = format_notification_message(notification)
    
    # 根据类型发送
    webhook_senders = {
        'wechat': send_wechat_webhook,
        'dingtalk': send_dingtalk_webhook,
        'feishu': send_feishu_webhook,
        'slack': send_slack_webhook,
        'custom': send_custom_webhook
    }
    
    sender = webhook_senders.get(webhook_type, send_custom_webhook)
    
    logger.info(f"发送 {webhook_type} Webhook通知: {rule['rule_name']}")
    
    success, error = sender(webhook_url, message)
    
    return success, error


def test_webhook(webhook_url, webhook_type='custom'):
    """
    测试Webhook连接
    """
    test_notification = {
        'fund_data': {
            '基金名称': '测试基金',
            '基金代码': '000000',
            '溢价率(%)': 5.0,
            '场内价格': 1.050,
            '基金净值': 1.000,
            '场内成交额': 100000
        },
        'rule': {
            'rule_name': '测试规则',
            'notification': {
                'webhook_url': webhook_url,
                'webhook_type': webhook_type
            }
        }
    }
    
    return send_webhook_notification(test_notification)
