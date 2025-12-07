from fastapi import APIRouter
from pydantic import BaseModel
from app.config.params import update_enhance_params, get_enhance_params, reset_enhance_params


router = APIRouter()


class EnhanceParamsUpdate(BaseModel):
    lut_strength: float = None
    gamma: float = None
    clahe_clip_limit: float = None


@router.post("/api/update_enhance_params")
async def update_params(params: EnhanceParamsUpdate):
    # 1. 更新 params.py 中的全局参数
    update_enhance_params(
        lut_strength=params.lut_strength,
        gamma=params.gamma,
        clahe_clip_limit=params.clahe_clip_limit
    )
    return {"message": "增强参数更新成功", "current_params": get_enhance_params()}


@router.get("/api/enhance_params")
async def get_params():
    return get_enhance_params()

@router.post("/api/reset_enhance_params")
async def reset_params():
    """重置增强参数为默认值"""
    reset_enhance_params()
    return {
        "message": "增强参数已重置为默认值",
        "default_params": get_enhance_params()
    }