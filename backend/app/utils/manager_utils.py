# -*- coding: utf-8 -*-
"""
manager_utils.py
封装全局视频管理器访问逻辑，供路由调用。
"""

from fastapi import Request, HTTPException


def get_manager(request: Request):
    """
    从 FastAPI 全局 app.state 中获取 VideoStreamManager 实例。
    如果不存在则抛出异常。
    """
    try:
        manager = getattr(request.app.state, "video_manager", None)
        if manager is None:
            raise HTTPException(status_code=500, detail="VideoStreamManager 未初始化")
        return manager
    except Exception as e:
        print(f"❌ [get_manager] 获取视频管理器失败: {e}")
        raise HTTPException(status_code=500, detail=f"无法获取视频管理器: {e}")
