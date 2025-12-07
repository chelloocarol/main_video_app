# backend/app/router/camera_router.py
from fastapi import APIRouter, Request, HTTPException
from app.config.camera_config import get_cameras_with_rtsp
from app.utils.manager_utils import get_manager

router = APIRouter(prefix="/api/cameras", tags=["Camera"])

@router.get("")
async def list_cameras(request: Request):
    """
    获取所有摄像头及其在线状态
    - 数据来自配置文件 rtsp.json + VideoStreamManager 状态
    """
    manager = get_manager(request)
    cameras = get_cameras_with_rtsp()
    results = []

    for cam in cameras:
        camera_id = cam["camera_id"]
        # 判断是否正在推流
        is_running = manager.is_running(camera_id)
        cam["status"] = "online" if is_running else "offline"
        results.append(cam)

    return {
        "success": True,
        "data": results,
        "message": "获取摄像头列表成功"
    }


@router.get("/{camera_id}/status")
async def get_camera_status(request: Request, camera_id: str):
    """
    查询单个摄像头的在线状态
    """
    manager = get_manager(request)
    cameras = get_cameras_with_rtsp()

    # 查找摄像头是否存在
    cam_info = next((c for c in cameras if c["camera_id"] == camera_id), None)
    if not cam_info:
        raise HTTPException(status_code=404, detail=f"摄像头 {camera_id} 未注册")

    is_running = manager.is_running(camera_id)
    cam_info["status"] = "online" if is_running else "offline"

    return {
        "success": True,
        "data": cam_info,
        "message": f"摄像头 {camera_id} 状态获取成功"
    }
