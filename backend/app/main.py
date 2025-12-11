# backend/app/main.py
from typing import Optional

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
from pathlib import Path
import shutil
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse
def _read_env_file(env_path: Path):
    """读取 .env 文件并检测常见错误。

    - 返回 True 表示文件已成功加载
    - 返回 False 表示检测到错误，应尝试下一个候选路径
    """

    try:
        text = env_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        print(f"❌ .env 编码无效（必须为 UTF-8）：{env_path}")
        return False
    except Exception as exc:  # pragma: no cover - 仅保护文件 I/O
        print(f"❌ 无法读取 .env 文件 {env_path}: {exc}")
        return False

    invalid_lines = []
    for idx, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "=" not in stripped:
            invalid_lines.append(idx)

    if invalid_lines:
        print(f"⚠️ .env 语法错误（缺少 '='）: {env_path}，问题行: {invalid_lines}")
        return False

    load_dotenv(env_path)
    print(f"✅ 已加载 .env 文件: {env_path}")
    return True


def load_env_files(candidate_paths: Optional[list[Path]] = None):
    """加载 .env 文件并在缺失或错误时给出明确提示。

    - 优先 EXE 同级（_MEIPASS 解压目录旁）
    - 回退项目根（开发 & 测试）
    - 兜底当前工作目录
    - 语法/编码错误会记录并尝试下一个候选
    """

    candidates = [] if candidate_paths is None else list(candidate_paths)
    seen = set()

    if not candidates:
        exe_dir = Path(sys.executable).resolve().parent
        project_root = Path(__file__).resolve().parent.parent.parent

        if getattr(sys, "frozen", False):
            candidates.append(exe_dir / ".env")
        candidates.append(project_root / ".env")
        candidates.append(Path.cwd() / ".env")

    for env_path in candidates:
        resolved = env_path.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)

        if resolved.exists():
            if _read_env_file(resolved):
                break
    else:
        print("⚠️ 未找到 .env 文件，将使用默认环境变量")


# 加载环境变量
load_env_files()

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

def resolve_dist_path() -> Path:
    """返回前端 dist 目录，支持多重回退并在缺失时抛错。"""

    candidates = []
    seen = set()

    def add_candidate(path_like):
        if not path_like:
            return
        p = Path(path_like)
        key = str(p.resolve())
        if key not in seen:
            seen.add(key)
            candidates.append(p)

    # 1. 明确指定的环境变量优先
    add_candidate(os.getenv("FRONTEND_DIST"))

    # 2. PyInstaller `_MEIPASS` 路径
    if hasattr(sys, "_MEIPASS"):
        base_meipass = Path(sys._MEIPASS)
        add_candidate(base_meipass / "frontend" / "dist")
        add_candidate(base_meipass / "dist")

    # 2.1. 可执行文件同级（适配 PyInstaller 单文件模式解压到同级目录）
    exe_dir = Path(sys.executable).resolve().parent
    add_candidate(exe_dir / "frontend" / "dist")
    add_candidate(exe_dir / "dist")

    # 3. 源码/开发模式路径
    current_dir = Path(__file__).resolve()
    project_root = current_dir.parent.parent.parent  # /workspace/main_video_app
    backend_root = current_dir.parent.parent         # /workspace/main_video_app/backend
    add_candidate(project_root / "frontend" / "dist")
    add_candidate(backend_root / "frontend" / "dist")

    print("🔍 尝试定位前端 dist 目录，候选列表：")
    for c in candidates:
        print(" -", c)

    for path in candidates:
        if path and path.exists() and path.is_dir():
            index_file = path / "index.html"
            if index_file.exists():
                print(f"✅ 成功定位 dist 目录: {path}")
                return path
            else:
                print(f"⚠️ 发现目录 {path} 但缺少 index.html")

    raise RuntimeError("前端 dist 目录不存在，请确认已构建前端或在 PyInstaller 包内包含资源。")

def _import_cv2():
    import cv2  # noqa: F401
    return cv2


def validate_runtime_dependencies(raise_on_missing: bool = False):
    """在启动前校验关键依赖。

    - 默认仅告警不中止（便于打包自检与测试）
    - 设置 REQUIRE_RUNTIME_DEPENDENCIES=1 可强制报错
    """

    strict = raise_on_missing or os.getenv("REQUIRE_RUNTIME_DEPENDENCIES", "0") == "1"

    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        message = "❌ 未找到 ffmpeg，可执行文件缺失将导致视频管道无法启动。"
        print(message)
        if strict:
            raise RuntimeError(message)
    else:
        print(f"✅ ffmpeg 路径: {ffmpeg_path}")

    try:
        _import_cv2()
        print("✅ OpenCV 模块可用")
    except Exception as exc:  # pragma: no cover - 仅启动检查
        message = f"❌ OpenCV 加载失败: {exc}"
        print(message)
        if strict:
            raise RuntimeError(message)


# 初始化 FastAPI
app = FastAPI(title="Mine Video Enhancement Backend")
app.state = SimpleNamespace()
app.add_middleware(ErrorLoggerMiddleware)

# 确定前端资源目录，若缺失则直接抛错避免半启动状态
DIST_DIR = resolve_dist_path()

# 挂载静态资源到 /static，避免与 API/Fallback 冲突
app.mount("/static", StaticFiles(directory=DIST_DIR, html=False), name="frontend-static")

assets_dir = DIST_DIR / "assets"
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=assets_dir, html=False), name="frontend-assets")

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
    origins = [url.strip() for url in frontend_urls.split(",") if url.strip()]

# 确保本地调试/EXE 同源地址可用，防止前端请求指向客户端 localhost 时被 CORS 拦截
for fallback_origin in ("http://localhost:8000", "http://127.0.0.1:8000"):
    if fallback_origin not in origins:
        origins.append(fallback_origin)

print("=" * 60)
print("✅ 加载的 FRONTEND_URLS:", os.getenv("FRONTEND_URLS"))
print("=" * 60)
print("✅ CORS allow_origins =", origins)

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
from app import auth
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

        # 关键依赖检查（PyInstaller 环境尤其重要）
        validate_runtime_dependencies()

        # 检查关键组件
        cameras = get_cameras_with_rtsp()
        print(f"📡 已加载 {len(cameras)} 个摄像头配置")

        # 预加载用户信息以确保外部 data/users.json 可用
        users = auth.load_users()
        print(f"🔐 已加载 {len(users)} 个用户条目")

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
    - 所有 /api/** 请求保持 404
    - 先尝试返回真实静态文件
    - 其他路径统一回落到 index.html
    """

    # API 请求直接 404 以避免吞掉错误
    if full_path.startswith("api"):
        return JSONResponse({"detail": "API 路径不存在"}, status_code=404)

    requested_path = (DIST_DIR / full_path.lstrip("/")).resolve()

    # 防止越权访问 dist 之外的路径
    if not str(requested_path).startswith(str(DIST_DIR.resolve())):
        return JSONResponse({"detail": "路径不允许"}, status_code=403)

    if requested_path.is_file():
        return FileResponse(requested_path)

    index_path = DIST_DIR / "index.html"
    if not index_path.exists():
        return JSONResponse({"detail": "前端入口缺失"}, status_code=500)

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
