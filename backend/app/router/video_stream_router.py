# -*- coding: utf-8 -*-
# 视频流相关路由
import numpy as np
from fastapi import APIRouter, Query, Request, HTTPException
from fastapi.responses import StreamingResponse
import cv2
import time
import logging
from app.config.camera_config import get_cameras_with_rtsp, load_rtsp_config
from app.config.params import get_enhance_params

router = APIRouter(prefix="/api/video", tags=["Video"])
logger = logging.getLogger(__name__)

def success_response(data, message: str = ""):
    return {"success": True, "data": data, "message": message}

def get_manager(request: Request):
    """从 app.state 获取全局 VideoStreamManager 实例"""
    manager = getattr(request.app.state, "video_manager", None)
    if not manager:
        logger.error("❌ 视频管理器未初始化")
        raise HTTPException(status_code=500, detail="视频管理器未初始化")
    return manager

@router.get("/stream")
async def get_stream(request: Request, camera_id: str = Query("camera-1")):
    """
    返回视频流信息：
    - original_stream_url：原始 MJPEG 流（非 RTSP）
    - enhanced_stream_url：增强后 MJPEG 流
    """
    # 从配置文件加载 RTSP 地址
    rtsp_config = load_rtsp_config()

    if camera_id not in rtsp_config:
        raise HTTPException(status_code=404, detail=f"摄像头 {camera_id} 未注册")

    # 🔧 动态获取当前请求的 host（支持内网部署）
    host = request.headers.get("host", "localhost:8000")
    protocol = "https" if request.url.scheme == "https" else "http"
    base_url = f"{protocol}://{host}"

    # 从摄像头配置获取名称
    cameras = get_cameras_with_rtsp()
    camera_info = next((c for c in cameras if c["camera_id"] == camera_id), None)

    if not camera_info:
        raise HTTPException(status_code=404, detail=f"摄像头 {camera_id} 配置未找到")

    return success_response(
        {
            "camera_id": camera_id,
            "camera_name": camera_info.get("name", f"摄像头 {camera_id}"),
            "camera_location": camera_info.get("location", "未知位置"),
            "original_stream_url": f"{base_url}/api/video/frame?camera_id={camera_id}&type=raw",
            "enhanced_stream_url": f"{base_url}/api/video/frame?camera_id={camera_id}&type=enhanced",
        },
        "获取视频流地址成功",
    )

@router.get("/frame")
async def get_frame(request: Request, camera_id: str = Query("camera-1"), type: str = Query("enhanced")):
    """
    获取视频帧（MJPEG 流）

    优化点：
    1. 帧率控制，避免推流过快
    2. 优化 JPEG 编码参数（高质量 + 渐进式）
    3. 添加 Content-Length 头，提升浏览器解析速度
    4. 短暂休眠，避免 CPU 空转

    Args:
        camera_id: 摄像头ID
        type: 流类型（"raw" 原始流 / "enhanced" 增强流）
    """
    manager = get_manager(request)

    print(f"🔍 请求摄像头: {camera_id}")
    print(f"🔍 已注册摄像头: {list(manager.processors.keys())}")

    processor = manager.get_processor(camera_id)
    if processor is None:
        print(f"❌ 摄像头 {camera_id} 未找到！")
        raise HTTPException(404, f"摄像头 {camera_id} 未注册")

    # 帧率限制（可根据需要调整）
    fps_limit = 25
    frame_interval = 1.0 / fps_limit if fps_limit > 0 else 0

    def frame_generator():
        last_frame_time = 0

        # JPEG 编码参数（参考旧项目的优化设置）
        encode_params = [
            int(cv2.IMWRITE_JPEG_QUALITY), 85,  # 高质量
            int(cv2.IMWRITE_JPEG_OPTIMIZE), 1,  # 优化压缩
            int(cv2.IMWRITE_JPEG_PROGRESSIVE), 1  # 渐进式编码
        ]

        while True:
            try:
                current_time = time.time()

                # 帧率控制
                if frame_interval > 0 and (current_time - last_frame_time) < frame_interval:
                    time.sleep(0.005)  # 短暂休眠，避免 CPU 空转
                    continue

                # 获取帧
                if type == "raw":
                    frame = manager.get_original_frame(camera_id)
                else:
                    frame = manager.get_enhanced_frame(camera_id)

                # 如果没有帧，短暂等待
                if frame is None:
                    blank = np.zeros((540, 960, 3), dtype=np.uint8)
                    ret, buffer = cv2.imencode(".jpg", blank)

                    yield (
                            b"--frame\r\n"
                            b"Content-Type: image/jpeg\r\n\r\n" +
                            buffer.tobytes() +
                            b"\r\n"
                    )
                    time.sleep(0.02)
                    continue

                # 编码为 JPEG
                ret, buffer = cv2.imencode('.jpg', frame, encode_params)
                if not ret:
                    logger.warning(f"⚠️ [{camera_id}] JPEG 编码失败")
                    continue

                last_frame_time = current_time

                # 生成 MJPEG 流（带 Content-Length）
                yield (
                        b'--frame\r\n'
                        b'Content-Type: image/jpeg\r\n'
                        b'Content-Length: ' + str(len(buffer)).encode() + b'\r\n\r\n' +
                        buffer.tobytes() + b'\r\n'
                )

            except Exception as e:
                logger.error(f"❌ 生成视频帧时出错 ({camera_id}): {e}")
                time.sleep(0.1)

    # 返回流式响应
    headers = {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Connection": "close"
    }

    return StreamingResponse(
        frame_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers=headers
    )

@router.get("/status")
async def get_status(request: Request, camera_id: str = Query("camera-1")):
    """获取视频增强状态"""

    try:
        manager = get_manager(request)

        # 检查摄像头是否在运行
        is_running = manager.is_running(camera_id)

        # 获取当前 FPS
        fps = manager.get_fps(camera_id)

        # 获取当前增强参数
        current_params = get_enhance_params()

        return success_response(
            {
                "is_running": is_running,
                "camera_id": camera_id,
                "fps": round(fps, 2),
                "params": current_params if is_running else None,
            },
            "获取增强状态成功",
        )

    except Exception as e:
        logger.error(f"❌ 处理摄像头状态请求时出错: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/start")
async def start_enhancement(
        request: Request,
        camera_id: str = Query("camera-1"),
        lut_strength: float = None,
        gamma: float = None,
        clahe_clip_limit: float = None
):
    """
    启动视频增强（兼容接口）：增强默认始终开启，仅支持参数热更新。
    """
    manager = get_manager(request)

    if any([lut_strength, gamma, clahe_clip_limit]):
        from app.config.params import update_enhance_params
        update_enhance_params(
            lut_strength=lut_strength,
            gamma=gamma,
            clahe_clip_limit=clahe_clip_limit
        )

    processor = manager.get_processor(camera_id)
    if not processor:
        raise HTTPException(status_code=404, detail=f"摄像头 {camera_id} 未注册")

    return success_response(
        {
            "is_running": True,
            "camera_id": camera_id,
            "fps": round(manager.get_fps(camera_id), 2),
        },
        "视频增强默认已开启，start 接口仅用于兼容与参数更新",
    )

@router.post("/stop")
async def stop_enhancement(request: Request, camera_id: str = Query("camera-1")):
    """
    停止视频增强（兼容接口）：增强默认开启，不再实际关闭。
    """
    manager = get_manager(request)
    processor = manager.get_processor(camera_id)
    if not processor:
        raise HTTPException(status_code=404, detail=f"摄像头 {camera_id} 未注册")

    return success_response(
        {
            "is_running": True,
            "camera_id": camera_id,
            "fps": round(manager.get_fps(camera_id), 2),
        },
        "视频增强始终开启，stop 接口仅返回兼容状态",
    )

@router.post("/update_params")
async def update_params(
        request: Request,
        camera_id: str = Query(None),
        lut_strength: float = None,
        gamma: float = None,
        clahe_clip_limit: float = None
):
    """
    实时更新增强参数

    Args:
        camera_id: 摄像头ID（None 表示更新所有摄像头）
        lut_strength: LUT 强度
        gamma: Gamma 值
        clahe_clip_limit: CLAHE 对比度限制
    """
    manager = get_manager(request)

    # 更新全局参数
    from app.config.params import update_enhance_params, get_enhance_params
    update_enhance_params(
        lut_strength=lut_strength,
        gamma=gamma,
        clahe_clip_limit=clahe_clip_limit
    )

    # 构造参数字典
    params_dict = {}
    if lut_strength is not None:
        params_dict["lut_strength"] = lut_strength
    if gamma is not None:
        params_dict["gamma"] = gamma
    if clahe_clip_limit is not None:
        params_dict["clahe_clip_limit"] = clahe_clip_limit

    # 通知处理器更新参数
    if params_dict:
        manager.update_enhance_params(camera_id=camera_id, params=params_dict)

    return success_response(
        {
            "camera_id": camera_id or "all",
            "params": get_enhance_params()
        },
        "参数更新成功",
    )


@router.get("/test")
async def test_route():
    """测试路由是否工作"""
    return success_response({"timestamp": time.time()}, "Video router is working!")

@router.get("/fps/{camera_id}")
async def get_camera_fps(request: Request, camera_id: str):
    """
    获取指定摄像头的 FPS

    Args:
        camera_id: 摄像头ID

    Returns:
        {"camera_id": str, "fps": float}
    """
    manager = get_manager(request)
    fps = manager.get_fps(camera_id)

    return success_response({"camera_id": camera_id, "fps": round(fps, 2)}, "获取 FPS 成功")