# -*- coding: utf-8 -*-
# backend/app/auth.py - JWT用户认证模块
import os
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel

# ============================================================================
# 配置项
# ============================================================================

# JWT 密钥（生产环境必须从环境变量读取）
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production-09a8f7b6c5d4e3f2")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # Token 有效期（分钟）

# 密码哈希配置
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer 认证（用于依赖注入）
bearer_scheme = HTTPBearer()

# JSON 用户文件路径
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
USER_FILE = os.path.join(BASE_DIR, "data", "users.json")

# ============================================================================
# Pydantic 数据模型
# ============================================================================

class User(BaseModel):
    """对外公开的用户信息模型"""
    user_id: int
    username: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: str = "user"
    disabled: bool = False


class UserInDB(User):
    """数据库中的用户模型（包含密码哈希）"""
    hashed_password: str

# =====================================================
# 用户文件加载与密码验证
# =====================================================

def load_users() -> Dict[str, Any]:
    """从JSON文件加载用户"""
    print(f"[DEBUG] 尝试加载用户文件: {USER_FILE}")

    if not os.path.exists(USER_FILE):
        raise FileNotFoundError(f"用户文件未找到: {USER_FILE}")
    with open(USER_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def get_user(username: str) -> Optional[UserInDB]:
    """从JSON加载并获取用户"""
    users = load_users()
    if username in users:
        return UserInDB(**users[username])
    return None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """生成密码哈希（初始化用户时使用）"""
    return pwd_context.hash(password)

def authenticate_user(username: str, password: str) -> Optional[UserInDB]:
    """验证用户名密码"""
    user = get_user(username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


# ============================================================================
# JWT Token 处理函数
# ============================================================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    生成 JWT 访问令牌

    Args:
        data: 要编码到 token 中的数据（通常包含 username、user_id 等）
        expires_delta: Token 有效期（可选）

    Returns:
        str: JWT token 字符串

    示例:
        token = create_access_token(
            data={"sub": username, "user_id": user_id},
            expires_delta=timedelta(minutes=30)
        )
    """
    to_encode = data.copy()

    # 设置过期时间
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    # 添加过期时间到 payload
    to_encode.update({"exp": expire})

    # 生成 JWT token
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """验证并解码 JWT"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# ============================================================================
# FastAPI 依赖函数
# ============================================================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> User:
    """
       从请求头中提取 Bearer Token，并返回当前用户信息。
       可在受保护路由中使用：
           @router.get("/protected")
           async def protected(user: User = Depends(get_current_user)):
               return {"msg": f"Hello, {user.username}"}
    """
    # 提取 token
    token = credentials.credentials

    # 定义异常
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭证",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_user(payload["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """获取当前活跃用户（未禁用）"""
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="用户已被禁用")
    return current_user


async def require_admin(
        current_user: User = Depends(get_current_active_user)
) -> User:
    """
    要求管理员权限（FastAPI 依赖项）

    Args:
        current_user: 当前用户

    Returns:
        User: 管理员用户信息

    Raises:
        HTTPException: 403 Forbidden（如果用户不是管理员）

    使用示例:
        @app.post("/admin/settings")
        async def update_settings(admin: User = Depends(require_admin)):
            return {"message": "Settings updated"}
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    return current_user

# ============================================================
# 调试或工具函数
# ============================================================

if __name__ == "__main__":
    """生成密码哈希示例"""
    password = input("请输入要加密的密码: ")
    print(f"加密后: {get_password_hash(password)}")
