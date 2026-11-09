# 股票数据预处理与可视化

基于 Python + pandas 的股票历史行情数据预处理项目。读取原始 CSV 行情数据，计算常用技术指标，输出处理后的数据文件，并生成多维度可视化图表。

数据覆盖 1980-12-12 至 2020-09-01，共 10,016 个交易日。

## 功能

`main.py` 按顺序完成以下步骤：

1. **数据加载与清洗** — 读取 CSV、去列名空格、将 `Date` 解析为日期并按时间升序排列。
2. **指标计算**：
   | 输出列 | 说明 | 计算方式 |
   | --- | --- | --- |
   | `MA_20` | 20 日收盘价移动平均线 | 收盘价 20 日滚动均值 |
   | `Daily_Return` | 每日收益率 | `(Close_t - Close_{t-1}) / Close_{t-1}` |
   | `Volume_Change_Pct` | 成交量变化百分比（%） | `(Volume_t - Volume_{t-1}) / Volume_{t-1} * 100` |
   | `Intraday_Volatility` | 日内波动性（高低价差） | `High - Low` |
   | `Cumulative_Return` | 累积收益率 | `∏(1 + Daily_Return) - 1` |
3. **结果输出** — 将带指标的数据写入 `stock_data_gupiao_processed.csv`。
4. **可视化** — 生成 6 张 300 DPI 图表，保存在 `visualizations/`。

## 项目结构

```
.
├── main.py                          # 主程序：预处理 + 可视化
├── requirements.txt                 # 依赖
├── stock_data_gupiao.csv            # 原始行情数据
├── stock_data_gupiao_processed.csv  # 预处理后的数据（运行后生成）
├── visualizations/                  # 可视化图表（运行后生成）
│   ├── 1_收盘价和移动平均线.png
│   ├── 2_每日收益率分析.png
│   ├── 3_成交量变化百分比.png
│   ├── 4_日内波动性.png
│   ├── 5_累积收益率.png
│   └── 6_综合仪表板.png
└── 可视化结果总结报告.md             # 图表解读与结论
```

## 数据格式

`stock_data_gupiao.csv` 需包含以下列：

| 列名 | 含义 |
| --- | --- |
| `Date` | 交易日期 |
| `Open` | 开盘价 |
| `High` | 当日最高价 |
| `Low` | 当日最低价 |
| `Close` | 收盘价 |
| `Adj Close` | 复权收盘价 |
| `Volume` | 成交量 |

更换数据时，保持上述列名不变即可直接运行。

## 环境要求

- Python 3.8+
- 依赖见 `requirements.txt`：

```
pandas>=1.3.0
matplotlib>=3.3.0
seaborn>=0.11.0
```

## 快速开始

```bash
# 安装依赖
pip install -r requirements.txt

# 或使用虚拟环境
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 运行
python main.py
```

运行后会在终端打印前 10 行结果，并生成 `stock_data_gupiao_processed.csv` 和 `visualizations/` 下的全部图表。

## 可视化图表

- **收盘价与 MA20**：观察长期趋势及价格与均线的交叉。
- **每日收益率分析**：时间序列 + 分布直方图，反映波动特征。
- **成交量变化百分比**：观察市场活跃度与交易情绪。
- **日内波动性**：每日高低价差，衡量单日价格波动幅度。
- **累积收益率**：评估"买入并持有"的长期回报。
- **综合仪表板**：六个子图汇总所有指标，便于全局观察。

各图表的详细解读与关键结论见 [可视化结果总结报告.md](可视化结果总结报告.md)。

## 说明

- 指标的前几个交易日为空值属正常现象：MA20 需 20 个交易日窗口，收益率类指标需要前一日数据。
- 图表默认使用中文字体（`Arial Unicode MS` / `SimHei`），若在 Linux 环境下中文显示为方块，需安装并配置相应中文字体。
