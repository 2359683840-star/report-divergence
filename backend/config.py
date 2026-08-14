"""
集中配置 — 研报分歧探测器
"""
import os
from dotenv import load_dotenv

load_dotenv()

# 性能配置
AKSHARE_TIMEOUT = 15     # akshare单次请求超时(秒)
AKSHARE_RETRY_COUNT = 1  # 重试次数（减少以快速降级到缓存）
LLM_TIMEOUT = 30         # LLM API超时(秒)

# LLM 配置
LLM_API_KEY = os.getenv("DASHSCOPE_API_KEY") or os.getenv("LLM_API_KEY", "")
LLM_BASE_URL = os.getenv("API_BASE_URL", "https://api.deepseek.com")
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-chat")

# 评级量化映射（5=最看多, 1=最看空）
RATING_SCORE_MAP = {
    "买入": 5, "强烈推荐": 5, "推荐": 4, "优于大市": 4,
    "增持": 4, "谨慎推荐": 3, "中性": 3, "同步大市": 3,
    "谨慎增持": 3, "减持": 2, "弱于大市": 1, "卖出": 1
}

# 分歧等级阈值
DIVERGENCE_LEVELS = [
    (0,   20,  "低分歧",   "分析师观点高度一致"),
    (20,  50,  "中等分歧", "存在一定观点差异"),
    (50,  80,  "高分歧",   "分析师观点显著分化"),
    (80,  101, "极度分歧", "市场预期严重撕裂"),
]
