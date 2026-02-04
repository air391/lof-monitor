"""
监控引擎 - 负责检测LOF基金是否触发通知条件
"""

import json
import logging
import uuid
from datetime import datetime, timedelta
from pathlib import Path
import os

logger = logging.getLogger(__name__)

# 数据文件路径
DATA_DIR = "data"
RULES_FILE = os.path.join(DATA_DIR, "monitor_rules.json")
HISTORY_FILE = os.path.join(DATA_DIR, "notification_history.json")


def ensure_data_dir():
    """确保数据目录存在"""
    Path(DATA_DIR).mkdir(exist_ok=True)


def load_rules():
    """加载监控规则"""
    ensure_data_dir()
    if os.path.exists(RULES_FILE):
        try:
            with open(RULES_FILE, 'r', encoding='utf-8') as f:
                rules = json.load(f)
            logger.info(f"成功加载 {len(rules)} 条监控规则")
            return rules
        except Exception as e:
            logger.error(f"加载规则失败: {e}")
            return []
    else:
        logger.info("规则文件不存在，返回空列表")
        return []


def save_rules(rules):
    """保存监控规则"""
    ensure_data_dir()
    try:
        with open(RULES_FILE, 'w', encoding='utf-8') as f:
            json.dump(rules, f, ensure_ascii=False, indent=2)
        logger.info(f"成功保存 {len(rules)} 条监控规则")
        return True
    except Exception as e:
        logger.error(f"保存规则失败: {e}")
        return False


def load_history():
    """加载通知历史"""
    ensure_data_dir()
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                history = json.load(f)
            logger.info(f"成功加载 {len(history)} 条通知历史")
            return history
        except Exception as e:
            logger.error(f"加载历史失败: {e}")
            return []
    else:
        return []


def save_history(history):
    """保存通知历史（保留最近1000条）"""
    ensure_data_dir()
    try:
        # 只保留最近1000条
        if len(history) > 1000:
            history = history[-1000:]
        
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
        logger.info(f"成功保存 {len(history)} 条通知历史")
        return True
    except Exception as e:
        logger.error(f"保存历史失败: {e}")
        return False


def create_rule(rule_data):
    """创建新规则"""
    rules = load_rules()
    
    new_rule = {
        "rule_id": str(uuid.uuid4()),
        "enabled": True,
        "created_at": datetime.now().isoformat(),
        "last_triggered": None,
        "trigger_count": 0,
        **rule_data
    }
    
    rules.append(new_rule)
    save_rules(rules)
    logger.info(f"创建新规则: {new_rule['rule_name']}")
    return new_rule


def update_rule(rule_id, rule_data):
    """更新规则"""
    rules = load_rules()
    
    for i, rule in enumerate(rules):
        if rule['rule_id'] == rule_id:
            rules[i].update(rule_data)
            rules[i]['updated_at'] = datetime.now().isoformat()
            save_rules(rules)
            logger.info(f"更新规则: {rule_id}")
            return rules[i]
    
    logger.error(f"未找到规则: {rule_id}")
    return None


def delete_rule(rule_id):
    """删除规则"""
    rules = load_rules()
    
    for i, rule in enumerate(rules):
        if rule['rule_id'] == rule_id:
            deleted_rule = rules.pop(i)
            save_rules(rules)
            logger.info(f"删除规则: {deleted_rule['rule_name']}")
            return True
    
    logger.error(f"未找到规则: {rule_id}")
    return False


def toggle_rule(rule_id):
    """切换规则启用/禁用状态"""
    rules = load_rules()
    
    for rule in rules:
        if rule['rule_id'] == rule_id:
            rule['enabled'] = not rule['enabled']
            save_rules(rules)
            logger.info(f"切换规则状态: {rule['rule_name']} -> {'启用' if rule['enabled'] else '禁用'}")
            return rule
    
    return None


def is_throttled(rule):
    """检查规则是否在限流期内"""
    if not rule.get('last_triggered'):
        return False
    
    throttle_minutes = rule.get('notification', {}).get('throttle_minutes', 30)
    last_triggered = datetime.fromisoformat(rule['last_triggered'])
    
    # 如果距离上次触发时间小于限流时间，返回True
    if datetime.now() - last_triggered < timedelta(minutes=throttle_minutes):
        return True
    
    return False


def check_condition(fund_data, rule):
    """检查基金数据是否满足触发条件"""
    condition = rule.get('condition', {})
    
    # 检查溢价率 >=
    if condition.get('premium_above') is not None:
        if fund_data.get('溢价率(%)', -999) < condition['premium_above']:
            return False
    
    # 检查溢价率 <=
    if condition.get('premium_below') is not None:
        if fund_data.get('溢价率(%)', 999) > condition['premium_below']:
            return False
    
    # 检查成交额 >=
    if condition.get('amount_above') is not None:
        if fund_data.get('场内成交额', 0) < condition['amount_above']:
            return False
    
    return True


def check_all_rules(spot_df):
    """
    检查所有启用的监控规则
    返回触发的通知列表
    """
    rules = load_rules()
    enabled_rules = [r for r in rules if r.get('enabled', False)]
    
    if not enabled_rules:
        logger.info("没有启用的监控规则")
        return []
    
    logger.info(f"开始检测 {len(enabled_rules)} 条监控规则")
    
    triggered_notifications = []
    
    for rule in enabled_rules:
        fund_code = rule.get('fund_code')
        
        # 获取该基金的当前数据
        fund_data_list = spot_df[spot_df['基金代码'] == fund_code]
        
        if fund_data_list.empty:
            logger.warning(f"规则 {rule['rule_name']} 对应的基金 {fund_code} 未找到数据")
            continue
        
        fund_data = fund_data_list.iloc[0].to_dict()
        
        # 检查触发条件
        if not check_condition(fund_data, rule):
            continue
        
        # 检查限流
        if is_throttled(rule):
            logger.info(f"规则 {rule['rule_name']} 触发但在限流期内，跳过通知")
            continue
        
        # 触发通知
        notification = {
            'notification_id': str(uuid.uuid4()),
            'rule': rule,
            'fund_data': fund_data,
            'triggered_at': datetime.now().isoformat()
        }
        
        triggered_notifications.append(notification)
        
        # 更新规则的最后触发时间
        update_rule_last_triggered(rule['rule_id'])
        
        logger.info(f"规则 {rule['rule_name']} 触发！基金: {fund_data.get('基金名称')}, 溢价率: {fund_data.get('溢价率(%)'):.2f}%")
    
    logger.info(f"检测完成，共触发 {len(triggered_notifications)} 条通知")
    
    return triggered_notifications


def update_rule_last_triggered(rule_id):
    """更新规则的最后触发时间"""
    rules = load_rules()
    
    for rule in rules:
        if rule['rule_id'] == rule_id:
            rule['last_triggered'] = datetime.now().isoformat()
            rule['trigger_count'] = rule.get('trigger_count', 0) + 1
            save_rules(rules)
            return True
    
    return False


def add_notification_history(notification, status, error_message=None):
    """添加通知历史记录"""
    history = load_history()
    
    history_record = {
        'notification_id': notification['notification_id'],
        'rule_id': notification['rule']['rule_id'],
        'rule_name': notification['rule']['rule_name'],
        'fund_code': notification['rule']['fund_code'],
        'fund_name': notification['rule']['fund_name'],
        'triggered_at': notification['triggered_at'],
        'premium_rate': notification['fund_data'].get('溢价率(%)'),
        'webhook_type': notification['rule'].get('notification', {}).get('webhook_type', 'custom'),
        'status': status,
        'error_message': error_message
    }
    
    history.append(history_record)
    save_history(history)
    
    logger.info(f"添加通知历史: {history_record['rule_name']} - {status}")
    
    return history_record


def get_rule_statistics():
    """获取规则统计信息"""
    rules = load_rules()
    history = load_history()
    
    total_rules = len(rules)
    enabled_rules = len([r for r in rules if r.get('enabled', False)])
    total_notifications = len(history)
    success_notifications = len([h for h in history if h.get('status') == 'success'])
    
    return {
        'total_rules': total_rules,
        'enabled_rules': enabled_rules,
        'total_notifications': total_notifications,
        'success_notifications': success_notifications,
        'failed_notifications': total_notifications - success_notifications
    }
