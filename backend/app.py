"""
LOF基金套利监控应用
实时监控中国LOF基金溢价套利机会

数据源：
- 实时行情：腾讯股票接口（云服务器友好）
- 基金净值：天天基金（akshare）
- 基金列表：天天基金（akshare）
"""

import os
import re

import streamlit as st
import pandas as pd
import numpy as np
import requests
from datetime import datetime
import logging
from pathlib import Path
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

import akshare as ak

# 缓存目录（与docker-compose挂载路径一致：/app/cache）
CACHE_DIR = "cache"
LOF_LIST_CACHE_FILE = os.path.join(CACHE_DIR, "lof_list_cache.json")

# 页面配置
st.set_page_config(
    page_title="LOF基金套利监控",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)


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
    cache_file = get_cache_filename()
    try:
        # 确保数据可序列化（日期转字符串）
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
    # 检查缓存（每天更新一次）
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

        # 筛选名称包含LOF的基金
        lof_df = df[df['基金简称'].str.contains('LOF', na=False)]

        # 过滤出可场内交易的LOF（代码以1或5开头的6位数）
        def is_lof_code(code):
            return bool(re.match(r'^[15]\d{5}$', str(code)))

        lof_tradable = lof_df[lof_df['基金代码'].apply(is_lof_code)].copy()
        lof_tradable = lof_tradable[['基金代码', '基金简称']].rename(columns={'基金简称': '基金名称'})

        # 去除名称中的(后端)等后缀，避免重复
        lof_tradable = lof_tradable[~lof_tradable['基金名称'].str.contains('后端', na=False)]

        # 保存缓存
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

    Args:
        codes: LOF基金代码列表
    Returns:
        dict: {code: {price, volume, amount, change_pct, ...}}
    """
    if not codes:
        return {}

    # 分批查询，每批最多50个
    batch_size = 50
    all_results = {}

    for i in range(0, len(codes), batch_size):
        batch_codes = codes[i:i+batch_size]

        # 构建查询字符串，深市用sz，沪市用sh
        query_codes = []
        for code in batch_codes:
            code_str = str(code)
            if code_str.startswith('1'):  # 深市LOF以1开头
                query_codes.append(f'sz{code_str}')
            else:  # 沪市LOF以5开头
                query_codes.append(f'sh{code_str}')

        try:
            url = f'https://qt.gtimg.cn/q={",".join(query_codes)}'
            resp = requests.get(url, timeout=15)
            resp.encoding = 'gbk'

            for line in resp.text.strip().split('\n'):
                if not line or '=' not in line:
                    continue
                # 解析格式: v_sz161725="51~白酒基金LOF~161725~0.725~..."
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
                            'volume': int(data[6]) if data[6] else 0,  # 成交量（手）
                            'amount': float(data[37]) * 10000 if data[37] else 0,  # 成交额（元，原数据是万元）
                            'change_pct': float(data[32]) if data[32] else 0,  # 涨跌幅
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
        # 获取历史净值数据，默认获取最近的数据
        end_date = datetime.now().strftime("%Y%m%d")
        start_date = (datetime.now().replace(day=1) - pd.DateOffset(months=1)).strftime("%Y%m%d")

        fund_info = ak.fund_etf_fund_info_em(fund=fund_code, start_date=start_date, end_date=end_date)

        if fund_info is not None and not fund_info.empty:
            # 获取最新一条记录
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


def get_all_nav_data(fund_codes, progress_bar=None):
    """
    使用3线程并发获取所有基金的净值数据
    """
    nav_data = {}
    
    # 检查缓存
    cache_data = load_cache()
    if cache_data:
        return cache_data
    
    logger.info(f"开始多线程查询净值，共 {len(fund_codes)} 只基金")
    
    with ThreadPoolExecutor(max_workers=3) as executor:
        future_to_code = {executor.submit(get_fund_nav, code): code for code in fund_codes}
        
        completed = 0
        for future in as_completed(future_to_code):
            fund_code = future_to_code[future]
            try:
                result = future.result()
                nav_data[fund_code] = result
                completed += 1
                
                if progress_bar:
                    progress_bar.progress(completed / len(fund_codes), text=f"正在获取基金净值... ({completed}/{len(fund_codes)})")
                
                if completed % 50 == 0:
                    logger.info(f"进度: {completed}/{len(fund_codes)}")
                    
            except Exception as e:
                logger.error(f"基金 {fund_code} 查询异常: {e}")
                nav_data[fund_code] = None
    
    # 保存到缓存
    save_cache(nav_data)
    
    return nav_data


def normalize_column_names(df):
    """
    标准化列名，统一使用中文列名
    """
    # 列名映射表（英文/其他格式 -> 中文）
    column_mapping = {
        '代码': '基金代码',
        'code': '基金代码',
        'symbol': '基金代码',
        '名称': '基金名称',
        'name': '基金名称',
        'fund_name': '基金名称',
        '最新价': '场内价格',
        'price': '场内价格',
        'current_price': '场内价格',
        '现价': '场内价格',
        '成交量': '场内成交量',
        'volume': '场内成交量',
        '成交额': '场内成交额',
        'amount': '场内成交额',
        'turnover': '场内成交额',
        '涨跌幅': '涨跌幅',
        'change_pct': '涨跌幅',
        '估值': '实时估值',
        'estimate': '实时估值',
    }
    
    # 重命名列
    df = df.rename(columns=column_mapping)
    
    logger.info(f"列名标准化后的列: {df.columns.tolist()}")
    
    return df


def get_lof_spot_data():
    """
    获取LOF场内实时行情数据
    数据源：腾讯股票接口 + 天天基金LOF列表
    """
    try:
        logger.info("正在获取LOF场内实时行情（腾讯数据源）...")

        # 1. 获取LOF基金列表
        lof_list = get_lof_list()
        if lof_list.empty:
            logger.error("无法获取LOF基金列表")
            return None

        fund_codes = lof_list['基金代码'].tolist()
        logger.info(f"共 {len(fund_codes)} 只LOF基金待查询")

        # 2. 从腾讯接口获取实时行情
        realtime_data = get_lof_realtime_tencent(fund_codes)
        logger.info(f"腾讯接口返回 {len(realtime_data)} 只基金行情")

        # 3. 构建DataFrame
        records = []
        for _, row in lof_list.iterrows():
            code = row['基金代码']
            name = row['基金名称']

            if code in realtime_data:
                rt = realtime_data[code]
                records.append({
                    '基金代码': code,
                    '基金名称': rt.get('name', name),  # 优先使用腾讯返回的名称
                    '场内价格': rt['price'],
                    '涨跌幅': rt['change_pct'],
                    '场内成交量': rt['volume'],
                    '场内成交额': rt['amount'],
                })
            else:
                # 没有行情数据的基金（可能停牌）
                records.append({
                    '基金代码': code,
                    '基金名称': name,
                    '场内价格': None,
                    '涨跌幅': None,
                    '场内成交量': None,
                    '场内成交额': None,
                })

        spot_df = pd.DataFrame(records)

        # 过滤掉没有价格的（停牌或无数据）
        valid_df = spot_df[spot_df['场内价格'].notna() & (spot_df['场内价格'] > 0)]
        logger.info(f"有效行情数据: {len(valid_df)} 只基金")

        return valid_df

    except Exception as e:
        error_msg = f"获取LOF场内行情失败: {e}"
        logger.error(error_msg)
        st.error(error_msg)
        import traceback
        st.error(f"详细错误: {traceback.format_exc()}")
        return None


def merge_and_calculate(spot_df, nav_data):
    """
    合并场内行情和净值数据，计算溢价率
    """
    logger.info("开始合并数据并计算溢价率")
    
    # 准备净值数据
    nav_list = []
    for code in spot_df['基金代码']:
        nav_info = nav_data.get(code)
        if nav_info and nav_info.get('nav'):
            nav_list.append(nav_info['nav'])
        else:
            nav_list.append(None)
    
    # 添加净值列
    spot_df = spot_df.copy()
    spot_df['基金净值'] = nav_list
    
    # 计算溢价率
    spot_df['溢价率(%)'] = (spot_df['场内价格'] - spot_df['基金净值']) / spot_df['基金净值'] * 100
    
    # 处理无效数据
    spot_df['溢价率(%)'] = spot_df['溢价率(%)'].replace([np.inf, -np.inf], np.nan)
    
    logger.info(f"数据合并完成，有效净值数据: {spot_df['基金净值'].notna().sum()} 条")
    
    return spot_df


def filter_data(df, min_premium, min_amount):
    """根据条件筛选数据"""
    filtered_df = df[
        (df['溢价率(%)'] >= min_premium) & 
        (df['场内成交额'] >= min_amount) &
        (df['基金净值'].notna())
    ].copy()
    
    # 按溢价率降序排序
    filtered_df = filtered_df.sort_values('溢价率(%)', ascending=False)
    
    return filtered_df


def highlight_premium_level(row):
    """
    根据溢价率高亮显示
    🟥 红色：溢价 ≥ 5%（鸡腿机会）
    🟡 黄色：溢价 2-5%（中等机会）
    ⚪ 无色：溢价 < 2%
    """
    premium = row['溢价率(%)']
    if pd.isna(premium):
        return [''] * len(row)
    
    if premium >= 5:
        color = 'background-color: #ffcccc'
    elif premium >= 2:
        color = 'background-color: #fff4cc'
    else:
        color = ''
    
    return [color] * len(row)


def display_overview_cards(df, filtered_df):
    """显示数据概览卡片"""
    total_count = len(df)
    filtered_count = len(filtered_df)
    chicken_leg_count = len(filtered_df[filtered_df['溢价率(%)'] >= 5])
    max_premium = filtered_df['溢价率(%)'].max() if len(filtered_df) > 0 else 0
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(label="总LOF数量", value=f"{total_count}")
    
    with col2:
        st.metric(label="符合条件", value=f"{filtered_count}")
    
    with col3:
        st.metric(label="🍗鸡腿机会（≥5%）", value=f"{chicken_leg_count}")
    
    with col4:
        st.metric(label="最高溢价率", value=f"{max_premium:.2f}%")

def display_dataframe_with_export(df, title, key):
    """显示数据表格并提供CSV导出"""
    st.subheader(title)
    
    # 准备显示的数据
    display_columns = [
        '基金代码', '基金名称', '场内价格', '基金净值', 
        '实时估值', '场内成交额', '溢价率(%)'
    ]
    
    # 检查列是否存在
    available_columns = [col for col in display_columns if col in df.columns]
    display_df = df[available_columns].copy()
    
    # 格式化数值列
    if '溢价率(%)' in display_df.columns:
        display_df['溢价率(%)'] = display_df['溢价率(%)'].apply(lambda x: f"{x:.2f}%" if pd.notna(x) else "N/A")
    if '场内成交额' in display_df.columns:
        display_df['场内成交额'] = display_df['场内成交额'].apply(lambda x: f"{x:,.0f}" if pd.notna(x) else "N/A")
    if '场内价格' in display_df.columns:
        display_df['场内价格'] = display_df['场内价格'].apply(lambda x: f"{x:.3f}" if pd.notna(x) else "N/A")
    if '基金净值' in display_df.columns:
        display_df['基金净值'] = display_df['基金净值'].apply(lambda x: f"{x:.3f}" if pd.notna(x) else "N/A")
    if '实时估值' in display_df.columns:
        display_df['实时估值'] = display_df['实时估值'].apply(lambda x: f"{x:.3f}" if pd.notna(x) else "N/A")
    
    # 应用高亮样式
    styled_df = df[available_columns].style.apply(highlight_premium_level, axis=1)
    
    # 显示表格
    st.dataframe(styled_df, use_container_width=True, height=400)
    
    # CSV导出
    csv = df[available_columns].to_csv(index=False, encoding='utf-8-sig')
    st.download_button(
        label=f"📥 导出{title}为CSV",
        data=csv,
        file_name=f"lof_{key}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
        mime="text/csv",
        key=f"download_{key}"
    )


def main():
    """主函数"""
    st.title("📈 LOF基金套利监控")
    st.markdown("实时监控中国LOF基金溢价套利机会 - **场外申购、场内卖出**")
    
    # 确保缓存目录存在
    ensure_cache_dir()
    
    # 侧边栏参数设置
    st.sidebar.header("⚙️ 参数设置")
    
    min_premium = st.sidebar.slider(
        "最小溢价率 (%)",
        min_value=0.0,
        max_value=10.0,
        value=1.5,
        step=0.1
    )
    
    min_amount = st.sidebar.slider(
        "最小成交额 (万元)",
        min_value=0,
        max_value=500,
        value=50,
        step=10
    )
    
    st.sidebar.markdown("---")
    st.sidebar.markdown("### 💡 使用说明")
    st.sidebar.info("""
    - **红色**：溢价 ≥ 5%（🍗鸡腿机会）
    - **黄色**：溢价 2-5%（中等机会）
    - **白色**：溢价 < 2%
    
    **套利策略**：
    1. 场外申购基金份额
    2. 等待份额到账（T+2或T+3）
    3. 场内卖出套利
    
    **注意**：
    - 需要考虑申购费和卖出佣金
    - 关注基金暂停申购风险
    - 溢价率可能快速变化
    """)
    
    # 缓存管理提示
    st.sidebar.markdown("---")
    st.sidebar.markdown("### 🗂️ 缓存管理")
    cache_file = get_cache_filename()
    if os.path.exists(cache_file):
        st.sidebar.success(f"✅ 今日缓存已存在\n{cache_file}")
        st.sidebar.markdown(f"*修改时间: {datetime.fromtimestamp(os.path.getmtime(cache_file)).strftime('%H:%M:%S')}*")
    else:
        st.sidebar.warning("⏳ 首次查询，预计需要2-3分钟")
    
    if st.sidebar.button("🗑️ 清除今日缓存"):
        if os.path.exists(cache_file):
            os.remove(cache_file)
            st.sidebar.success("缓存已清除！")
            st.rerun()
    
    # 数据加载
    with st.spinner("正在加载数据..."):
        # 获取场内行情
        spot_df = get_lof_spot_data()
        if spot_df is None:
            st.error("无法获取LOF场内行情数据，请稍后重试")
            return
        
        # 创建进度条
        progress_bar = st.progress(0, text="准备获取基金净值...")
        
        # 获取净值数据（带缓存）
        fund_codes = spot_df['基金代码'].tolist()
        nav_data = get_all_nav_data(fund_codes, progress_bar)
        
        progress_bar.empty()
    
    # 合并数据并计算溢价率
    merged_df = merge_and_calculate(spot_df, nav_data)
    
    # 筛选数据
    filtered_df = filter_data(merged_df, min_premium, min_amount * 10000)
    
    # 显示概览卡片
    st.markdown("---")
    display_overview_cards(merged_df, filtered_df)
    st.markdown("---")
    
    # 创建两个Tab
    tab1, tab2 = st.tabs(["🎯 套利机会（筛选后）", "📊 全量LOF数据"])
    
    with tab1:
        if len(filtered_df) > 0:
            display_dataframe_with_export(filtered_df, "符合条件的套利机会", "filtered")
        else:
            st.info(f"💡 当前没有符合条件的基金（溢价率 ≥ {min_premium}% 且 成交额 ≥ {min_amount}万）")
            st.markdown("**建议**：调整左侧参数降低筛选条件")
    
    with tab2:
        # 显示全量数据，按溢价率排序
        all_df_sorted = merged_df.sort_values('溢价率(%)', ascending=False)
        display_dataframe_with_export(all_df_sorted, "全量LOF数据（含无净值）", "all")
    
    # 页脚
    st.markdown("---")
    st.markdown(f"""
    <div style='text-align: center; color: gray; font-size: 12px;'>
    数据更新时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | 
    LOF基金数量：{len(merged_df)} | 
    缓存文件：{cache_file}
    </div>
    """, unsafe_allow_html=True)


if __name__ == "__main__":
    main()
