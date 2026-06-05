"""
LOF基金数据获取模块 - 无Streamlit依赖，供API服务器使用
"""

import os
import re
import json
import logging
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

import pandas as pd
import numpy as np
import requests
import akshare as ak

logger = logging.getLogger(__name__)

# 缓存目录（与docker-compose挂载路径一致：/app/cache）
CACHE_DIR = "cache"
LOF_LIST_CACHE_FILE = os.path.join(CACHE_DIR, "lof_list_cache.json")


def ensure_cache_dir():
    """确保缓存目录存在"""
    Path(CACHE_DIR).mkdir(exist_ok=True)
    logger.info(f"缓存目录已准备: {CACHE_DIR}")


def get_cache_filename():
    """获取当前日期的缓存文件名"""
    today = datetime.now().strftime("%Y%m%d")
    return os.path.join(CACHE_DIR, f"nav_cache_{today}.json")


def load_cache():
    """加载缓存数据"""
    cache_file = get_cache_filename()
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
            logger.info(f"成功加载缓存数据: {cache_file}")
            return cache_data
        except Exception as e:
            logger.warning(f"加载缓存失败: {e}")
    return None


def save_cache(nav_data):
    """保存数据到缓存"""
    ensure_cache_dir()
    cache_file = get_cache_filename()
    try:
        serializable_data = {}
        for code, data in nav_data.items():
            if data is not None:
                serializable_data[code] = {
                    'nav': float(data['nav']) if data.get('nav') else None,
                    'nav_date': str(data['nav_date']) if data.get('nav_date') else None
                }
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(serializable_data, f, ensure_ascii=False, indent=2)
        logger.info(f"缓存数据已保存: {cache_file}, 共 {len(serializable_data)} 只基金")
    except Exception as e:
        logger.error(f"保存缓存失败: {e}")


def get_lof_list():
    """
    获取所有可场内交易的LOF基金列表
    返回: DataFrame with columns ['基金代码', '基金名称']
    """
    ensure_cache_dir()
    if os.path.exists(LOF_LIST_CACHE_FILE):
        try:
            with open(LOF_LIST_CACHE_FILE, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
            cache_date = cache_data.get('date')
            today = datetime.now().strftime("%Y%m%d")
            if cache_date == today:
                logger.info(f"使用缓存的LOF列表，共 {len(cache_data['funds'])} 只")
                return pd.DataFrame(cache_data['funds'])
        except Exception as e:
            logger.warning(f"加载LOF列表缓存失败: {e}")

    try:
        logger.info("正在从天天基金获取LOF基金列表...")
        df = ak.fund_name_em()

        lof_df = df[df['基金简称'].str.contains('LOF', na=False)]

        def is_lof_code(code):
            return bool(re.match(r'^[15]\d{5}$', str(code)))

        lof_tradable = lof_df[lof_df['基金代码'].apply(is_lof_code)].copy()
        lof_tradable = lof_tradable[['基金代码', '基金简称']].rename(columns={'基金简称': '基金名称'})
        lof_tradable = lof_tradable[~lof_tradable['基金名称'].str.contains('后端', na=False)]

        cache_data = {
            'date': datetime.now().strftime("%Y%m%d"),
            'funds': lof_tradable.to_dict('records')
        }
        with open(LOF_LIST_CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)

        logger.info(f"成功获取 {len(lof_tradable)} 只可交易LOF基金")
        return lof_tradable

    except Exception as e:
        logger.error(f"获取LOF列表失败: {e}")
        return pd.DataFrame(columns=['基金代码', '基金名称'])


def get_lof_realtime_tencent(codes):
    """
    从腾讯股票接口获取LOF实时行情
    数据源：https://qt.gtimg.cn
    """
    if not codes:
        return {}

    batch_size = 50
    all_results = {}

    for i in range(0, len(codes), batch_size):
        batch_codes = codes[i:i+batch_size]

        query_codes = []
        for code in batch_codes:
            code_str = str(code)
            if code_str.startswith('1'):
                query_codes.append(f'sz{code_str}')
            else:
                query_codes.append(f'sh{code_str}')

        try:
            url = f'https://qt.gtimg.cn/q={",".join(query_codes)}'
            resp = requests.get(url, timeout=15)
            resp.encoding = 'gbk'

            for line in resp.text.strip().split('\n'):
                if not line or '=' not in line:
                    continue
                match = re.match(r'v_(\w+)="(.+)"', line)
                if match:
                    data = match.group(2).split('~')
                    if len(data) > 37:
                        code = data[2]
                        all_results[code] = {
                            'name': data[1],
                            'price': float(data[3]) if data[3] else 0,
                            'yesterday_close': float(data[4]) if data[4] else 0,
                            'open': float(data[5]) if data[5] else 0,
                            'volume': int(data[6]) if data[6] else 0,
                            'amount': float(data[37]) * 10000 if data[37] else 0,  # 万元→元
                            'change_pct': float(data[32]) if data[32] else 0,
                        }
        except Exception as e:
            logger.warning(f"腾讯接口查询失败 (batch {i//batch_size}): {e}")

    return all_results


def get_fund_nav(fund_code):
    """
    获取单只基金的净值信息（使用天天基金数据源）
    返回: {'nav': float, 'nav_date': str} 或 None
    """
    try:
        end_date = datetime.now().strftime("%Y%m%d")
        start_date = (datetime.now().replace(day=1) - pd.DateOffset(months=1)).strftime("%Y%m%d")
        fund_info = ak.fund_etf_fund_info_em(fund=fund_code, start_date=start_date, end_date=end_date)

        if fund_info is not None and not fund_info.empty:
            latest = fund_info.iloc[-1]
            nav = float(latest['单位净值'])
            nav_date = str(latest['净值日期'])
            logger.debug(f"基金 {fund_code} 净值获取成功: {nav}, 日期: {nav_date}")
            return {'nav': nav, 'nav_date': nav_date}
        else:
            logger.warning(f"基金 {fund_code} 净值数据为空")
            return None
    except Exception as e:
        logger.warning(f"获取基金 {fund_code} 净值失败: {e}")
        return None


def get_all_nav_data(fund_codes):
    """
    使用3线程并发获取所有基金的净值数据
    """
    # 检查缓存
    cache_data = load_cache()
    if cache_data:
        return cache_data

    logger.info(f"开始多线程查询净值，共 {len(fund_codes)} 只基金")
    nav_data = {}

    with ThreadPoolExecutor(max_workers=3) as executor:
        future_to_code = {executor.submit(get_fund_nav, code): code for code in fund_codes}

        completed = 0
        for future in as_completed(future_to_code):
            fund_code = future_to_code[future]
            try:
                result = future.result()
                nav_data[fund_code] = result
                completed += 1
                if completed % 50 == 0:
                    logger.info(f"进度: {completed}/{len(fund_codes)}")
            except Exception as e:
                logger.error(f"基金 {fund_code} 查询异常: {e}")
                nav_data[fund_code] = None

    save_cache(nav_data)
    return nav_data


def get_lof_spot_data():
    """
    获取LOF场内实时行情数据
    数据源：腾讯股票接口 + 天天基金LOF列表
    """
    try:
        logger.info("正在获取LOF场内实时行情（腾讯数据源）...")

        lof_list = get_lof_list()
        if lof_list.empty:
            logger.error("无法获取LOF基金列表")
            return None

        fund_codes = lof_list['基金代码'].tolist()
        logger.info(f"共 {len(fund_codes)} 只LOF基金待查询")

        realtime_data = get_lof_realtime_tencent(fund_codes)
        logger.info(f"腾讯接口返回 {len(realtime_data)} 只基金行情")

        records = []
        for _, row in lof_list.iterrows():
            code = row['基金代码']
            name = row['基金名称']

            if code in realtime_data:
                rt = realtime_data[code]
                records.append({
                    '基金代码': code,
                    '基金名称': rt.get('name', name),
                    '场内价格': rt['price'],
                    '涨跌幅': rt['change_pct'],
                    '场内成交量': rt['volume'],
                    '场内成交额': rt['amount'],
                })
            else:
                records.append({
                    '基金代码': code,
                    '基金名称': name,
                    '场内价格': None,
                    '涨跌幅': None,
                    '场内成交量': None,
                    '场内成交额': None,
                })

        spot_df = pd.DataFrame(records)
        valid_df = spot_df[spot_df['场内价格'].notna() & (spot_df['场内价格'] > 0)]
        logger.info(f"有效行情数据: {len(valid_df)} 只基金")
        return valid_df

    except Exception as e:
        import traceback
        logger.error(f"获取LOF场内行情失败: {e}")
        logger.error(traceback.format_exc())
        return None


def merge_and_calculate(spot_df, nav_data):
    """
    合并场内行情和净值数据，计算溢价率
    """
    logger.info("开始合并数据并计算溢价率")

    nav_list = []
    for code in spot_df['基金代码']:
        nav_info = nav_data.get(code)
        if nav_info and nav_info.get('nav'):
            nav_list.append(nav_info['nav'])
        else:
            nav_list.append(None)

    spot_df = spot_df.copy()
    spot_df['基金净值'] = nav_list
    spot_df['溢价率(%)'] = (spot_df['场内价格'] - spot_df['基金净值']) / spot_df['基金净值'] * 100
    spot_df['溢价率(%)'] = spot_df['溢价率(%)'].replace([np.inf, -np.inf], np.nan)

    logger.info(f"数据合并完成，有效净值数据: {spot_df['基金净值'].notna().sum()} 条")
    return spot_df
