# backend/app/main.py
print("🧩 main.py 启动中...")
import asyncio
import traceback
import os
import sys
from fastapi.staticfiles import StaticFiles
import glob
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from types import SimpleNamespace
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse
# 加载环境变量
load_dotenv()

def debug_environment():
    print("========== 环境自检开始 ==========")

    # 1. 打印运行模式
    if getattr(sys, 'frozen', False):
        print("运行模式: PyInstaller 打包 EXE")
    else:
        print("运行模式: Python 源码运行（开发模式）")

    # 2. EXE 路径
    print("sys.executable:", sys.executable)

    # 3. PyInstaller 临时目录
    if getattr(sys, 'frozen', False):
        print("PyInstaller 临时目录(sys._MEIPASS):", sys._MEIPASS)
    else:
        print("sys._MEIPASS 不存在（不是 EXE 打包模式）")

    # 4. 查找 DLL 文件
    search_dirs = []

    if getattr(sys, 'frozen', False):
        search_dirs.append(sys._MEIPASS)
    search_dirs.append(os.getcwd())

    print("\n=== DLL 检测 ===")

    cv2_found = False
    dll_found = False

    for folder in search_dirs:
        print(f"检查目录: {folder}")

        # 找 cv2.pyd
        for path in glob.glob(os.path.join(folder, "cv2*.pyd")):
            print("  ✔ 找到 cv2.pyd:", path)
            cv2_found = True

        # 找 OpenCV DLL
        for path in glob.glob(os.path.join(folder, "opencv_*.dll")):
            print("  ✔ 找到 OpenCV DLL:", path)
            dll_found = True

    if not cv2_found:
        print("  ❌ 未找到 cv2.pyd (ImportError 原因之一)")
    if not dll_found:
        print("  ❌ 未找到 opencv_*.dll (ImportError 原因之二)")

    print("\n=== 路径检查 ===")
    print("当前工作目录:", os.getcwd())
    print("sys.path:")
    for p in sys.path:
        print("   ", p)

    print("\n========== 环境自检结束 ==========")

class ErrorLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        print(f"🟢 [Middleware] 开始处理: {request.method} {request.url}")
        try:
            response = await call_next(request)
            print(f"🟢 [Middleware] 处理完成: {request.method} {request.url} -> {response.status_code}")
            return response
        except Exception as e:
            print(f"🔥 [Middleware] 捕获异常: {type(e).__name__}: {str(e)}")
            traceback.print_exc()

            return JSONResponse(
                status_code=500,
                content={
                    "detail": str(e),
                    "type": type(e).__name__,
                    "traceback": traceback.format_exc()
                }
            )

# 初始化 FastAPI
app = FastAPI(title="Mine Video Enhancement Backend")
app.state = SimpleNamespace()
app.add_middleware(ErrorLoggerMiddleware)

# 确定前端资源目录，若缺失则直接抛错避免半启动状态
DIST_DIR = resolve_dist_path()



# 适配 PyInstaller 的 _MEIPASS 临时目录
if hasattr(sys, "_MEIPASS"):
    BASE_PATH = sys._MEIPASS
else:
    BASE_PATH = os.path.dirname(os.path.abspath(__file__))

# 尝试从 PyInstaller 打包路径中寻找 dist
DIST_DIR = os.path.join(BASE_PATH, "frontend", "dist")

print("🔍 静态资源路径识别为:", DIST_DIR)

if not os.path.exists(DIST_DIR):
    print("❌ 前端 dist 目录不存在:", DIST_DIR)
else:
    print("✅ 成功加载前端 dist:", DIST_DIR)

# 挂载静态资源
app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")

# =====================================================================
# CORS 设置
# =====================================================================
# 🔧 修复：读取环境变量并支持开发模式
ENV = os.getenv("ENV", "production")
if ENV == "development":
    # 开发模式：允许所有来源（仅用于调试）
    origins = ["*"]
    print("⚠️ 开发模式：允许所有 CORS 来源")
else:
    # 生产模式：只允许配置的来源
    frontend_urls = os.getenv("FRONTEND_URLS", "http://localhost:5173")
    origins = [url.strip() for url in frontend_urls.split(",")]

print("=" * 60)
print("✅ 加载的 FRONTEND_URLS:", os.getenv("FRONTEND_URLS"))
print("=" * 60)
print("✅ CORS allow_origins =", origins)

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# =====================================================================
# 🌟 全局请求打印钩子（强制捕获所有请求）
# =====================================================================
@app.middleware("http")
async def print_request_middleware(request, call_next):
    print(f"🧭 收到请求: {request.method} {request.url}")
    try:
        response = await call_next(request)
        print(f"🧭 响应状态: {response.status_code}")
        return response
    except Exception as e:
        import traceback
        print("🔥 全局异常:", e)
        traceback.print_exc()
        raise

# =====================================================================
# 导入各个路由
# =====================================================================
from app.router import (
    auth_router,
    camera_router,
    enhance_router,
    settings_router,
    video_stream_router,
)
print("✅ 所有路由模块导入成功")

# 导入视频管理与配置
from app.video_stream_manager import VideoStreamManager
from app.config.camera_config import get_cameras_with_rtsp

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)



# =====================================================================
# 注册路由
# =====================================================================
app.include_router(auth_router.router)
app.include_router(camera_router.router)
app.include_router(enhance_router.router)
app.include_router(settings_router.router)
app.include_router(video_stream_router.router)

# ============================================================================
# 应用生命周期事件
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """应用启动时执行"""
    try:
        print("=" * 60)
        print("🚀 矿井视频增强系统启动中...")

        # 检查关键组件
        cameras = get_cameras_with_rtsp()
        print(f"📡 已加载 {len(cameras)} 个摄像头配置")

        # 初始化视频管理器
        video_manager = VideoStreamManager()
        app.state.video_manager = video_manager

        # 测试注册摄像头
        for cam in cameras:
            print(f"📷 注册摄像头: {cam['camera_id']}")
            video_manager.register_camera(
                camera_id=cam["camera_id"],
                rtsp_url=cam.get("rtsp_url"),
                lut_path=cam.get("lut_path"),
                name=cam.get("name", f"Camera {cam['camera_id']}"),
                location=cam.get("location", "未知位置")
            )

        print("✅ 系统启动完成")

    except Exception as e:
        print(f"❌ 启动过程中发生错误: {e}")
        traceback.print_exc()
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时执行"""
    print("=" * 60)
    print("🛑 矿井视频增强系统关闭中...")
    print("=" * 60)

    # ✅ 取出全局视频管理器并安全关闭
    video_manager = getattr(app.state, "video_manager", None)
    if video_manager:
        video_manager.stop_all()
        print("✅ 视频流管理器已清理")
    else:
        print("⚠️ 未找到视频流管理器实例")

    print("👋 应用已安全关闭")
    print("=" * 60)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理器"""
    import traceback
    print("=" * 60)
    print(f"❌ 全局异常捕获: {type(exc).__name__}")
    print(f"❌ 异常信息: {str(exc)}")
    print(f"❌ 请求路径: {request.url}")
    print("=" * 60)
    traceback.print_exc()
    print("=" * 60)

    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "type": type(exc).__name__,
            "path": str(request.url)
        }
    )

@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    """
    SPA 单页应用 fallback：
    所有非 /api 的请求都返回 index.html
    """
    # 忽略 API 路径
    if full_path.startswith("api"):
        return JSONResponse({"detail": "API 路径不存在"}, status_code=404)

    # 忽略静态资源目录（资产文件必须走 StaticFiles）
    if full_path.startswith(("assets", "favicon", "logo", "static", "manifest", "robots")):
        return JSONResponse({"detail": "静态资源不存在"}, status_code=404)

    index_path = os.path.join(DIST_DIR, "index.html")
    return FileResponse(index_path)



# 防止 asyncio 输出异常日志
asyncio.get_event_loop().set_exception_handler(lambda loop, context: None)
# ============================================================================
# 主程序入口
# ============================================================================
# 命令行参数处理
if len(sys.argv) > 1 and sys.argv[1] == "--debug-env":
    debug_environment()
    sys.exit(0)
if __name__ == "__main__":

    import uvicorn
    from app.main import app  # ← 关键：导入 app 对象

    SERVER_IP = os.getenv("SERVER_IP", "0.0.0.0")
    SERVER_PORT = int(os.getenv("SERVER_PORT", 8000))

    uvicorn.run(app, host=SERVER_IP, port=SERVER_PORT)
