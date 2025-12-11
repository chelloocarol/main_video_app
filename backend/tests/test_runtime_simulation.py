import importlib
import os
import sys
from pathlib import Path
from typing import Optional

import numpy as np

import pytest
from fastapi.testclient import TestClient

# 确保可以 import app.*
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def reload_main(
    monkeypatch,
    dist_dir: Path,
    frozen: bool = False,
    extra_env: Optional[dict] = None,
    preset_env: bool = True,
    use_cv2_stub: bool = True,
):
    """重新加载 app.main，确保使用指定 dist 目录和运行模式。"""
    for mod in list(sys.modules.keys()):
        if mod.startswith("app."):
            sys.modules.pop(mod)
    sys.modules.pop("app", None)

    monkeypatch.setenv("FRONTEND_DIST", str(dist_dir))
    if preset_env:
        monkeypatch.setenv("ENV", "production")
        monkeypatch.setenv("FRONTEND_URLS", "http://example.com")
    else:
        monkeypatch.delenv("ENV", raising=False)
        monkeypatch.delenv("FRONTEND_URLS", raising=False)
    monkeypatch.delenv("REQUIRE_RUNTIME_DEPENDENCIES", raising=False)

    if extra_env:
        for key, value in extra_env.items():
            if value is None:
                monkeypatch.delenv(key, raising=False)
            else:
                monkeypatch.setenv(key, value)

    monkeypatch.setattr(sys, "executable", str(dist_dir / "video_backend.exe"))
    if frozen:
        monkeypatch.setattr(sys, "frozen", True, raising=False)
        monkeypatch.setattr(sys, "_MEIPASS", str(dist_dir.parent / "_internal"), raising=False)
    else:
        monkeypatch.setattr(sys, "frozen", False, raising=False)
        if hasattr(sys, "_MEIPASS"):
            delattr(sys, "_MEIPASS")

    if use_cv2_stub:
        install_cv2_stub()

    import app.main as main
    importlib.reload(main)
    return main


def install_cv2_stub():
    class Cv2Stub:
        IMWRITE_JPEG_QUALITY = 1
        IMWRITE_JPEG_OPTIMIZE = 2
        IMWRITE_JPEG_PROGRESSIVE = 3
        COLOR_BGR2LAB = 4
        COLOR_LAB2BGR = 5

        @staticmethod
        def imencode(ext, img, params=None):
            return True, b"stub"

        @staticmethod
        def createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)):
            class ClaheStub:
                def __init__(self, clipLimit, tileGridSize):
                    self._clip = clipLimit
                    self._grid = tileGridSize

                def getClipLimit(self):
                    return self._clip

                def getTilesGridSize(self):
                    return self._grid

                def apply(self, img):
                    return img

            return ClaheStub(clipLimit, tileGridSize)

        @staticmethod
        def LUT(img, table):
            return img

        @staticmethod
        def cvtColor(img, code):
            return img

        @staticmethod
        def split(lab):
            return (lab, lab, lab)

        @staticmethod
        def merge(parts):
            return parts[0]

        @staticmethod
        def filter2D(img, ddepth, kernel):
            return img

    sys.modules["cv2"] = Cv2Stub()
    return Cv2Stub


@pytest.fixture()
def dist_structure(tmp_path):
    dist_dir = tmp_path / "frontend" / "dist"
    assets = dist_dir / "assets"
    assets.mkdir(parents=True)
    (dist_dir / "index.html").write_text("<html>spa</html>", encoding="utf-8")
    (dist_dir / "app.js").write_text("console.log('root')", encoding="utf-8")
    (assets / "app.js").write_text("console.log('ok')", encoding="utf-8")
    return dist_dir


class TestEnvResolution:
    def test_env_in_exe_dir(self, tmp_path, monkeypatch):
        dist_dir = tmp_path / "frontend" / "dist"
        dist_dir.mkdir(parents=True)
        (dist_dir / "index.html").write_text("<html>spa</html>", encoding="utf-8")
        env_file = dist_dir / ".env"
        env_file.write_text("FRONTEND_URLS=http://exe.example.com", encoding="utf-8")

        main = reload_main(monkeypatch, dist_dir, frozen=True, preset_env=False)
        assert os.getenv("FRONTEND_URLS") == "http://exe.example.com"

    def test_env_fallback_project_root(self, tmp_path, monkeypatch):
        dist_dir = tmp_path / "frontend" / "dist"
        dist_dir.mkdir(parents=True)
        (dist_dir / "index.html").write_text("<html>spa</html>", encoding="utf-8")

        project_root = tmp_path / "project"
        project_root.mkdir()
        env_file = project_root / ".env"
        env_file.write_text("FRONTEND_URLS=http://project.example.com", encoding="utf-8")

        main = reload_main(monkeypatch, dist_dir, frozen=True, preset_env=False)
        main.load_env_files(candidate_paths=[env_file])
        assert os.getenv("FRONTEND_URLS") == "http://project.example.com"

    def test_env_missing_everywhere(self, tmp_path, monkeypatch, capsys):
        dist_dir = tmp_path / "frontend" / "dist"
        dist_dir.mkdir(parents=True)
        (dist_dir / "index.html").write_text("<html>spa</html>", encoding="utf-8")

        main = reload_main(monkeypatch, dist_dir, frozen=False, preset_env=False)
        main.load_env_files(candidate_paths=[tmp_path / "missing.env"])
        captured = capsys.readouterr()
        assert "未找到 .env 文件" in captured.out

    def test_env_malformed(self, tmp_path, monkeypatch, capsys):
        dist_dir = tmp_path / "frontend" / "dist"
        dist_dir.mkdir(parents=True)
        (dist_dir / "index.html").write_text("<html>spa</html>", encoding="utf-8")

        env_file = tmp_path / ".env"
        env_file.write_text("INVALID_LINE", encoding="utf-8")

        main = reload_main(monkeypatch, dist_dir, frozen=False, preset_env=False)
        main.load_env_files(candidate_paths=[env_file])
        captured = capsys.readouterr()
        assert "语法错误" in captured.out
        assert os.getenv("FRONTEND_URLS") is None


class TestConfigAndLut:
    def test_missing_config(self, tmp_path, monkeypatch):
        monkeypatch.setattr(sys, "frozen", True, raising=False)
        monkeypatch.setattr(sys, "executable", str(tmp_path / "video_backend.exe"))
        from app.config import camera_config
        cameras = camera_config.get_cameras_with_rtsp()
        assert cameras == []

    def test_malformed_json(self, tmp_path, monkeypatch):
        monkeypatch.setattr(sys, "frozen", True, raising=False)
        exe_dir = tmp_path
        monkeypatch.setattr(sys, "executable", str(exe_dir / "video_backend.exe"))
        config_dir = exe_dir / "config"
        config_dir.mkdir()
        (config_dir / "camera_info.json").write_text("{bad json}", encoding="utf-8")
        (config_dir / "rtsp.json").write_text("{}", encoding="utf-8")

        from app.config import camera_config
        cameras = camera_config.get_cameras_with_rtsp()
        assert cameras == []

    def test_missing_lut(self, tmp_path, monkeypatch):
        monkeypatch.setattr(sys, "frozen", True, raising=False)
        monkeypatch.setattr(sys, "executable", str(tmp_path / "video_backend.exe"))
        install_cv2_stub()
        from app.video_stream_manager import VideoStreamProcessor
        vsp = VideoStreamProcessor("cam", "rtsp://camera-1", str(tmp_path / "lut" / "missing.npy"))
        assert vsp.lut is None

    def test_corrupted_lut(self, tmp_path, monkeypatch):
        monkeypatch.setattr(sys, "frozen", True, raising=False)
        monkeypatch.setattr(sys, "executable", str(tmp_path / "video_backend.exe"))
        lut_dir = tmp_path / "lut"
        lut_dir.mkdir()
        lut_file = lut_dir / "mapping.npy"
        lut_file.write_bytes(b"not a numpy file")
        install_cv2_stub()
        from app.video_stream_manager import VideoStreamProcessor
        vsp = VideoStreamProcessor("cam", "rtsp://camera-1", str(lut_file))
        assert vsp.lut is None


class TestSpaFallback:
    def test_spa_routes(self, dist_structure, monkeypatch):
        main = reload_main(monkeypatch, dist_structure)
        client = TestClient(main.app)
        for path in ["/video", "/settings", "/login"]:
            resp = client.get(path)
            assert resp.status_code == 200
            assert b"spa" in resp.content

        resp = client.get("/assets/missing.png")
        assert resp.status_code == 404

        resp = client.get("/static/app.js")
        assert resp.status_code == 200


class TestRuntimeDependencies:
    def test_ffmpeg_present(self, tmp_path, monkeypatch):
        dist_dir = tmp_path / "dist"
        dist_dir.mkdir(parents=True)
        (dist_dir / "index.html").write_text("<html>spa</html>", encoding="utf-8")
        main = reload_main(monkeypatch, dist_dir, preset_env=False)
        monkeypatch.setattr(main.shutil, "which", lambda _: "/usr/bin/ffmpeg")
        main.validate_runtime_dependencies()

    def test_ffmpeg_missing(self, tmp_path, monkeypatch, capsys):
        dist_dir = tmp_path / "dist"
        dist_dir.mkdir(parents=True)
        (dist_dir / "index.html").write_text("<html>spa</html>", encoding="utf-8")
        main = reload_main(monkeypatch, dist_dir, preset_env=False)
        monkeypatch.setattr(main.shutil, "which", lambda _: None)
        main.validate_runtime_dependencies()
        captured = capsys.readouterr()
        assert "未找到 ffmpeg" in captured.out

    def test_cv2_missing(self, tmp_path, monkeypatch, capsys):
        dist_dir = tmp_path / "dist"
        dist_dir.mkdir(parents=True)
        (dist_dir / "index.html").write_text("<html>spa</html>", encoding="utf-8")
        main = reload_main(monkeypatch, dist_dir, preset_env=False)
        def raise_import():
            raise ImportError("cv2 missing")
        monkeypatch.setattr(main, "_import_cv2", raise_import)
        main.validate_runtime_dependencies()
        captured = capsys.readouterr()
        assert "OpenCV 加载失败" in captured.out


class TestMeipassSimulation:
    def test_meipass_present(self, dist_structure, monkeypatch):
        internal = dist_structure.parent.parent / "_internal"
        internal.mkdir(parents=True)
        main = reload_main(monkeypatch, dist_structure, frozen=True)
        assert main.DIST_DIR == dist_structure

    def test_meipass_missing_dev_mode(self, dist_structure, monkeypatch):
        main = reload_main(monkeypatch, dist_structure, frozen=False)
        assert main.DIST_DIR == dist_structure

    def test_wrong_cwd(self, dist_structure, tmp_path, monkeypatch):
        target = tmp_path / "other"
        target.mkdir(parents=True, exist_ok=True)
        monkeypatch.chdir(target)
        main = reload_main(monkeypatch, dist_structure, frozen=True)
        assert main.DIST_DIR == dist_structure
        assert os.getenv("FRONTEND_URLS") == "http://example.com"