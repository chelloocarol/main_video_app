from fastapi import APIRouter, Depends, Form, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.auth import authenticate_user, create_access_token, decode_access_token, get_user, User


router = APIRouter(prefix="/api", tags=["Auth"])

# Bearer 认证
bearer_scheme = HTTPBearer()

# ---------------------------------------------------------------------
# 路由部分
# ---------------------------------------------------------------------

@router.post("/token")
async def login(username: str = Form(...), password: str = Form(...)):
    """用户登录：验证用户名和密码，返回 统一响应格式"""
    user = authenticate_user(username, password)
    if not user:
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = create_access_token({"sub": user.username, "user_id": user.user_id})

    return {
        "success": True,
        "data": {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "username": user.username,
                "full_name": user.full_name,
                "email": user.email,
                "role": user.role,
                "is_active": not user.disabled,
            },
        },
        "message": "登录成功",
    }


@router.get("/user/me")
async def read_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    """获取当前登录用户信息（统一响应格式）"""
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="无效Token")

    username = payload.get("sub")
    user = get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return {
        "success": True,
        "data": {
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "is_active": not user.disabled,
        },
        "message": "获取用户信息成功",
    }

@router.post("/logout")
async def logout():
    """登出接口（目前仅形式上返回成功，保持统一格式）"""
    return {"success": True, "data": None, "message": "用户已登出"}
