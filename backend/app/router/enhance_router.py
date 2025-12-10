from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.config.params import get_enhance_params, reset_enhance_params, update_enhance_params


router = APIRouter(tags=["Enhance"])


class EnhanceParamsUpdate(BaseModel):
    lut_strength: Optional[float] = None
    gamma: Optional[float] = None
    clahe_clip_limit: Optional[float] = None


@router.post("/api/update_enhance_params")
async def update_params(params: EnhanceParamsUpdate):
    # 1. 更新 params.py 中的全局参数
    update_enhance_params(
        lut_strength=params.lut_strength,
        gamma=params.gamma,
        clahe_clip_limit=params.clahe_clip_limit
    )
    return {"success": True, "data": get_enhance_params(), "message": "增强参数更新成功"}


@router.get("/api/enhance_params")
async def get_params():
    return {"success": True, "data": get_enhance_params(), "message": "获取增强参数成功"}

@router.post("/api/reset_enhance_params")
async def reset_params():
    """重置增强参数为默认值"""
    reset_enhance_params()
    return {"success": True, "data": get_enhance_params(), "message": "增强参数已重置为默认值"}