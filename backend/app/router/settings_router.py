# backend/routers/settings_router.py
import json
import os
from typing import Optional, Tuple

from fastapi import APIRouter
from pydantic import BaseModel, Field


router = APIRouter(prefix="/api/settings", tags=["系统设置"])

SETTINGS_FILE = "config/system_settings.json"

# -----------------------------
# 数据模型定义
# -----------------------------
class EnhancementSettings(BaseModel):
    lut_strength: float = Field(default=0.8, ge=0.0, le=1.0, description="LUT 强度")
    gamma: float = Field(default=1.2, ge=0.1, le=3.0, description="Gamma 值")
    clahe_clip_limit: float = Field(default=2.0, ge=1.0, le=10.0, description="CLAHE 对比度限制")
    clahe_tile_grid_size: Optional[Tuple[int, int]] = (8, 8)


class SystemSettings(BaseModel):
    enhancement: EnhancementSettings = EnhancementSettings()
    video: Optional[dict] = {
        "default_resolution": "1920x1080",
        "frame_rate": 30,
        "quality": "high",
    }
    system: Optional[dict] = {
        "auto_start": False,
        "save_logs": True,
        "log_level": "info",
    }
    notification: Optional[dict] = {
        "enable_email": False,
        "enable_sound": True,
    }


# -----------------------------
# 内部工具函数
# -----------------------------
def load_settings() -> SystemSettings:
    """从文件加载设置，如果不存在则使用默认配置"""
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return SystemSettings(**data)
    else:
        return SystemSettings()


def save_settings(settings: SystemSettings):
    """保存设置到文件"""
    os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings.model_dump(), f, indent=2, ensure_ascii=False)


# -----------------------------
# 路由接口定义
# -----------------------------
@router.get("/get")
def get_settings():
    """获取系统设置"""
    return load_settings()


@router.post("/update")
def update_settings(new_settings: dict):
    """更新系统设置"""
    current = load_settings()
    updated = current.model_dump()

    # 合并更新字段
    for key, value in new_settings.items():
        if isinstance(value, dict) and key in updated:
            updated[key].update(value)
        else:
            updated[key] = value

    settings_obj = SystemSettings(**updated)
    save_settings(settings_obj)
    return {"success": True, "data": settings_obj, "message": "系统设置已更新"}


@router.post("/reset")
def reset_settings():
    """恢复默认设置"""
    default = SystemSettings()
    save_settings(default)
    return {"success": True, "data": default, "message": "系统设置已重置"}