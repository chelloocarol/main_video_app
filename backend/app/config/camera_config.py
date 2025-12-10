import json
import os
import sys
from pathlib import Path
from typing import Dict, Union

PathType = Union[str, os.PathLike, Path]

# ======================================================
#   基础路径工具函数（外部配置强制热加载）
# ======================================================

def _get_base_dir() -> Path:
    """
    判断程序运行环境：
    - 如果是 PyInstaller 打包后的 EXE，则 base_dir = EXE 所在目录
    - 否则（开发环境），base_dir = backend/app/config 所在目录
    """
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent

BASE_DIR = _get_base_dir()

def get_external_config_path(filename: str) -> Path:
    """
    外部配置路径：
    - PyInstaller 模式：EXE 同级的 config/filename
    - 开发模式：当前配置目录下的 filename（不再回退到内置副本）
    """
    if getattr(sys, 'frozen', False):
        return BASE_DIR / "config" / filename
    return BASE_DIR / filename

def get_external_data_path(filename: str) -> Path:
    """返回外部 data 目录下的文件路径"""
    if getattr(sys, 'frozen', False):
        return BASE_DIR / "data" / filename
    return BASE_DIR / filename

def get_external_lut_path(filename: str) -> Path:
    """返回外部 lut 目录下的文件路径"""
    lut_dir = BASE_DIR / "lut"
    return lut_dir / filename

# ======================================================
#  通用 JSON 加载器（外部优先，内部兜底）
# ======================================================

def load_config_file(external_path: PathType) -> dict:
    """
    强制从外部路径读取配置，缺失时抛出清晰地诊断错误。
    这些文件不会打包进 PyInstaller，必须由运维提供。
    """

    resolved_path = Path(external_path)
    if not resolved_path.exists():
        raise FileNotFoundError(
            f"必需的外部配置文件缺失: {resolved_path}. 请在可执行文件同级 config/data/lut 目录下提供。"
        )

    try:
        print(f"📌 使用外部配置文件: {resolved_path}")
        with resolved_path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        raise RuntimeError(f"读取外部配置失败: {resolved_path}: {exc}") from exc

# ======================================================
#  专用加载接口（你只需要用这三个）
# ======================================================

def load_camera_info() -> dict:
    """加载 camera_info.json（热加载）"""
    return load_config_file(
        external_path=get_external_config_path("camera_info.json"),
    )


def load_rtsp_config() -> Dict[str, str]:
    """加载 rtsp.json（热加载）"""
    return load_config_file(
        external_path=get_external_config_path("rtsp.json"),
    )


def load_user_data() -> Dict:
    """
    加载 backend/data/users.json（热加载）
    你未来想热加载 data/logs.json、data/xxx.json，也用同样方式扩展
    """
    return load_config_file(
        external_path=get_external_data_path("users.json"),
    )

# ======================================================
#  LUT 加载逻辑（新增）
# ======================================================

def resolve_lut_path(lut_filename: str) -> str:
    """
    外部优先加载lut/xxx.npy，若不存在则加载内置的项目路径
    lut_filename 例如："mapping_lut_1.npy"
    """
    external_lut = get_external_lut_path(lut_filename)

    # 外部 LUT 优先
    if external_lut.exists():
        print(f"📌 使用外部 LUT 文件：{external_lut}")
        return str(external_lut)

    # 内置 LUT 路径（相对 app/lut/...）
    internal_lut = Path(__file__).resolve().parent.parent / "lut" / lut_filename

    print(f"📌 使用内置 LUT 文件：{internal_lut}")
    return str(internal_lut)

# ======================================================
#  摄像头合并逻辑
# ======================================================

def get_cameras_with_rtsp():
    """整合 camera_info.json 与 rtsp.json，并解析 LUT 路径"""
    base_info = load_camera_info()
    rtsp_map = load_rtsp_config()

    cameras = []

    for cam in base_info:
        cam_copy = cam.copy()
        cam_id = cam_copy["camera_id"]

        # ---- RTSP 映射 ----
        if cam_id in rtsp_map:
            cam_copy["rtsp_url"] = rtsp_map[cam_id]
        else:
            print(f"⚠️ RTSP JSON 未包含 {cam_id}，使用占位地址")
            cam_copy["rtsp_url"] = f"rtsp://localhost:8554/{cam_id}"

        # ---- LUT 路径解析 ----
        if cam_copy.get("lut_path"):
            lut_filename = os.path.basename(cam_copy["lut_path"])
            cam_copy["lut_path"] = resolve_lut_path(lut_filename)

        cameras.append(cam_copy)

    return cameras