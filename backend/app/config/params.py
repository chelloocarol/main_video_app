# params.py - configuration parameters
import os
from typing import Dict, Any, Tuple
from .camera_config import get_cameras_with_rtsp

# ========================================================================
# 通用配置
# ========================================================================

# 前端地址，用于 CORS 配置或返回给前端
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
# 开发模式标记，用于决定是否启用开发专用路由
ENABLE_DEV_HTML = os.getenv("ENABLE_DEV_HTML", "true").lower() == "true"
# JWT 秘钥（实际部署中请改为安全值）
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 默认 24 小时

# ========================================================================
# 视频增强默认参数
# ========================================================================

DEFAULT_ENHANCE_PARAMS: Dict[str, Any] = {
    "lut_enabled": True,
    "lut_strength": 1.0,  # 🔧 从 1.0 降低到 0.7
    "lut_gamma": 0.85,  # 🔧 从 1.2 改为 0.85(提亮)
    "lut_brightness": 20, # 🔧 增加亮度偏移
    "lut_contrast": 1.2, # 🔧 从 1.1 降低到 1.05
    "clahe_enabled": True,
    "clahe_clip_limit": 1.8,  # 🔧 从 2.0 降低到 1.8
    "clahe_tile_grid_size": (16, 16), # 🔧 从 (8,8) 改为 (16,16),减少色块
    "defogging_enabled": False, # 保持关闭
    "defogging_strength": 0.0
}

# 当前增强参数（可在运行时修改）
current_enhance_params: Dict[str, Any] = DEFAULT_ENHANCE_PARAMS.copy()

# ========================================================================
# LUT 映射表路径配置（按摄像头 ID）
# ========================================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LUT_PATHS = {
    str(i): os.path.join(BASE_DIR, f"lut/mapping_lut_{i}.npy") for i in range(1, 11)
}

# ========================================================================
# 摄像头信息（示例，可替换为数据库或配置文件读取）
# ========================================================================

CAMERAS = get_cameras_with_rtsp()

# ========================================================================
# 辅助函数
# ========================================================================


def get_camera_by_id(camera_id: str) -> Dict[str, Any]:
    """根据摄像头ID返回摄像头信息"""
    for cam in CAMERAS:
        if cam["camera_id"] == camera_id:
            return cam
    return None


def get_enhance_params() -> Dict[str, Any]:
    """返回当前增强参数"""
    return current_enhance_params.copy()

def update_enhance_params(lut_strength: float = None, gamma: float = None, clahe_clip_limit: float = None):
    """动态修改视频增强参数"""
    global current_enhance_params
    if lut_strength is not None:
        current_enhance_params["lut_strength"] = lut_strength
    if gamma is not None:
        current_enhance_params["gamma"] = gamma
    if clahe_clip_limit is not None:
        current_enhance_params["clahe_clip_limit"] = clahe_clip_limit



def reset_enhance_params():
    """重置增强参数为默认值"""
    global current_enhance_params
    current_enhance_params = DEFAULT_ENHANCE_PARAMS.copy()


def get_lut_path_by_camera(camera_id: str) -> str:
    """返回指定摄像头的 LUT 路径"""
    return LUT_PATHS.get(camera_id, os.path.join(BASE_DIR, "lut/default_mapping_lut.npy"))
