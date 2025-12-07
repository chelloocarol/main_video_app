import json
import os
import sys
from typing import Dict
from typing import Union

PathType = Union[str, os.PathLike]

# ======================================================
#  基础路径工具函数
# ======================================================

def _get_base_dir():
    """
    判断程序运行环境：
    - 如果是 PyInstaller 打包后的 EXE，则 base_dir = EXE 所在目录
    - 否则（开发环境），base_dir = 当前文件所在目录
    """
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


BASE_DIR = _get_base_dir()

def get_external_config_path(filename: str):
    """返回 EXE 同级目录 /config/filename"""
    return os.path.join(BASE_DIR, "config", filename)


def get_external_data_path(filename: str):
    """返回 EXE 同级目录 /data/filename"""
    return os.path.join(BASE_DIR, "data", filename)

def get_external_lut_path(filename: str) -> str:
    """返回 EXE 同级目录 lut/filename"""
    return os.path.join(BASE_DIR, "lut", filename)

# ======================================================
#  通用 JSON 加载器（外部优先，内部兜底）
# ======================================================

def load_config_file(external_path: PathType, internal_relative_path: PathType) -> dict:
    """
    一个通用的 JSON 读取器：
    - external_path：EXE 同级目录的实际路径（优先）
    - internal_relative_path：项目内部打包的默认路径
    """
    # 外部优先
    if os.path.exists(external_path):
        try:
            print(f"📌 使用外部配置文件: {external_path}")
            with open(external_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ 外部文件读取失败：{external_path} -> {e}")

    # 内置兜底
    internal_path = os.path.abspath(os.path.join(os.path.dirname(__file__), internal_relative_path))
    try:
        print(f"📌 使用内置配置文件: {internal_path}")
        with open(internal_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ 内置文件读取失败：{internal_path} -> {e}")
        return {}

# ======================================================
#  专用加载接口（你只需要用这三个）
# ======================================================

def load_camera_info() -> dict:
    """加载 camera_info.json（热加载）"""
    return load_config_file(
        external_path=get_external_config_path("camera_info.json"),
        internal_relative_path=str("camera_info.json"),
    )


def load_rtsp_config() -> Dict[str, str]:
    """加载 rtsp.json（热加载）"""
    return load_config_file(
        external_path=get_external_config_path("rtsp.json"),
        internal_relative_path="rtsp.json",
    )


def load_user_data() -> Dict:
    """
    加载 backend/data/users.json（热加载）
    你未来想热加载 data/logs.json、data/xxx.json，也用同样方式扩展
    """
    return load_config_file(
        external_path=get_external_data_path("users.json"),
        internal_relative_path=os.path.join("..", "..", "data", "users.json"),
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
    if os.path.exists(external_lut):
        print(f"📌 使用外部 LUT 文件：{external_lut}")
        return external_lut

    # 内置 LUT 路径（相对 app/lut/...）
    internal_lut = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", lut_filename))

    print(f"📌 使用内置 LUT 文件：{internal_lut}")
    return internal_lut

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