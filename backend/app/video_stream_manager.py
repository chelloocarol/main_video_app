# backend/app/video_stream_manager.py - 视频流管理器
import logging
import os
import sys
import subprocess
import threading
import time
from typing import Dict, Optional

import cv2
import numpy as np

from app.config.params import get_enhance_params

logger = logging.getLogger(__name__)


class VideoStreamProcessor:
    """
    视频流处理器
    - 使用 FFmpeg 管道读取 RTSP
    - 支持 LUT、Gamma、CLAHE、锐化、除雾
    - 参数从配置文件动态更新
    """

    def __init__(self, camera_id: str, rtsp_url: str, lut_path: str = None,
                 width: int = 960, height: int = 540):
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.lut_path = lut_path
        self.width = width
        self.height = height

        # 帧缓存
        self.original_frame = None
        self.enhanced_frame = None
        self.running = True
        self.lock = threading.Lock()

        # 性能监控
        self.frame_count = 0
        self.last_fps_time = time.time()
        self.current_fps = 0

        # 运行资源
        self.proc: Optional[subprocess.Popen] = None
        self.thread: Optional[threading.Thread] = None
        self.stderr_thread: Optional[threading.Thread] = None
        self.stderr_stop = threading.Event()

        # 加载 LUT
        self.lut = None
        if lut_path and os.path.exists(lut_path):
            try:
                self.lut = np.load(lut_path)
                if self.lut.shape == (256, 3):
                    print(f"🎨 [{camera_id}] LUT 加载成功: {lut_path}")
                else:
                    print(f"⚠ [{camera_id}] LUT 格式错误: {lut_path}")
                    self.lut = None
            except Exception as e:
                print(f"❌ [{camera_id}] LUT 加载失败: {e}")
                self.lut = None
        else:
            print(f"⚠ [{camera_id}] 没有找到 LUT 文件: {lut_path}")


        # CLAHE（会根据参数动态更新）
        self.clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

        # 锐化核
        self.sharpen_kernel = np.array([
            [-0.1, -0.1, -0.1],
            [-0.1, 1.8, -0.1],
            [-0.1, -0.1, -0.1]
        ])

        # RTSP 可用性检查（避免假流或错误流刷屏）
        self.online = False  # 初始 offline

        if not self._rtsp_available(self.rtsp_url):
            print(f"❌ RTSP 流不可达（跳过摄像头 {self.camera_id}）: {self.rtsp_url}")
            self.running = False
            return  # ❗ 不进入 FFmpeg，不启动线程，不刷屏

        # 启动 FFmpeg 管道
        self._start_ffmpeg_pipe()

        # 启动后台处理线程
        self.thread = threading.Thread(target=self._process_frames, daemon=True)
        self.thread.start()

        print(f"✅ [{camera_id}] 视频流处理器启动完成")

    # =========================================================
    # FFmpeg 管道
    # =========================================================
    def _rtsp_available(self, url: str) -> bool:
        """
        判断 RTSP 是否有效：
        1. 若 URL 最后一段为 camera-x → 占位流 → 直接返回 False
        2. 否则进行 TCP 端口检查（不执行 ffprobe，速度更快）
        """

        # -------------------------------------
        # 规则 1：占位流（假流）直接 offline
        # -------------------------------------
        last_seg = url.strip("/").split("/")[-1]
        if last_seg.startswith("camera-"):
            print(f"⚠️ 发现占位 RTSP 地址（跳过连接）: {url}")
            return False

        # -------------------------------------
        # 规则 2：真实 RTSP 的端口检测
        # -------------------------------------
        import socket
        try:
            target = url.replace("rtsp://", "").split("/")[0]
            if ":" in target:
                host, port = target.split(":")
                port = int(port)
            else:
                host, port = target, 554

            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1.0)
            sock.connect((host, port))
            sock.close()
            return True

        except:
            return False

    def _restart_ffmpeg(self):
        """重启 FFmpeg 进程"""
        if not self.running:
            return  # ✔ 正确退出方式

        print(f"🔁 [{self.camera_id}] 正在重启 FFmpeg...")

        try:
            if self.proc:
                self._terminate_proc()
        except:
            pass

        time.sleep(0.2)
        self._start_ffmpeg_pipe()

    def _terminate_proc(self):
        """安全关闭 FFmpeg 进程和管道，防止句柄泄漏。"""

        proc = getattr(self, "proc", None)
        if not proc:
            return

        try:
            proc.terminate()
            proc.wait(timeout=2)
        except subprocess.TimeoutExpired:
            try:
                proc.kill()
            except Exception:
                pass
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass
        finally:
            for pipe in (proc.stdout, proc.stderr):
                if pipe:
                    try:
                        pipe.close()
                    except Exception:
                        pass

        self.stderr_stop.set()
        if self.stderr_thread and self.stderr_thread.is_alive():
            self.stderr_thread.join(timeout=1)
        self.stderr_thread = None
        self.proc = None

    def _drain_stderr(self):
        """后台读取 stderr 防止缓冲区阻塞。"""
        if not self.proc or not self.proc.stderr:
            return

        while not self.stderr_stop.is_set():
            try:
                line = self.proc.stderr.readline()
                if not line:
                    break
                logger.debug(f"[FFmpeg:{self.camera_id}] {line.decode(errors='ignore').strip()}")
            except Exception:
                break

    def _start_ffmpeg_pipe(self):
        """启动 FFmpeg 进程并开启 stderr 读取。"""
        hwaccel_args = []
        # 检测是否支持 GPU（例如 NVIDIA）
        try:
            # 仅在 Windows 下尝试，避免 Linux 报错
            if sys.platform == "win32":
                hwaccel_args = ["-hwaccel", "d3d11va", "-hwaccel_output_format", "d3d11"]
        except Exception:
            pass

        cmd = [
            "ffmpeg",
            *hwaccel_args,  # 🔧 动态添加硬件加速参数

              # RTSP 优化参数
            "-rtsp_transport", "tcp",
            "-max_delay", "500000",
            "-reorder_queue_size", "0",
            "-fflags", "nobuffer+fastseek+flush_packets",
            "-flags", "low_delay",

            # 输入输出
            "-i", self.rtsp_url,
            "-f", "rawvideo",
            "-pix_fmt", "bgr24",
            "-s", f"{self.width}x{self.height}",
            "-vsync", "drop", #  自动丢弃慢帧
            "-"
        ]

        try:
            self.proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,  # 🔧 捕获错误信息
                bufsize=10 ** 8
            )
            self.stderr_stop.clear()
            self.stderr_thread = threading.Thread(target=self._drain_stderr, daemon=True)
            self.stderr_thread.start()
            print(f"🎥 FFmpeg 管道已启动: {self.rtsp_url}")
        except Exception as e:
            print(f"❌ 启动 FFmpeg 失败: {e}")
            self.running = False
            raise

    # =========================================================
    # 主循环：读取 → 增强 → 写入缓存
    # =========================================================
    def _process_frames(self):
        frame_size = self.width * self.height * 3
        skip_counter = 0  # 🔧 添加跳帧计数
        skip_interval = 3
        restart_failures = 0  # 🔧 添加重启计数
        empty_reads = 0
        max_empty_reads = 150  # 长时间无帧自动退出
        max_restart_attempts = 3

        while self.running:
            try:
                if not self.proc or not self.proc.stdout:
                    time.sleep(0.05)
                    continue

                raw = self.proc.stdout.read(frame_size)

                if not raw or len(raw) != frame_size:
                    print(f"⚠️ [{self.camera_id}] FFmpeg 读取失败，数据长度: {len(raw) if raw else 0}/{frame_size}")

                    # 🔧 重启 FFmpeg（如果多次失败）
                    restart_failures += 1
                    empty_reads += 1

                    if empty_reads >= max_empty_reads:
                        print(f"❌ [{self.camera_id}] 长时间无帧，自动关闭处理器")
                        self.running = False
                        break

                    if restart_failures > max_restart_attempts:
                        print(f"❌ [{self.camera_id}] FFmpeg 多次无法获取帧，停止重启！")
                        self.running = False
                        break

                    print(f"🔁 [{self.camera_id}] 重新启动 FFmpeg（尝试 {restart_failures}/{max_restart_attempts}）...")
                    self._restart_ffmpeg()
                    time.sleep(1)
                    continue

                    # 解码成功，重置失败计数
                restart_failures = 0
                empty_reads = 0

                # 🔧 跳帧策略（动态调整）
                skip_counter = (skip_counter + 1) % skip_interval
                if skip_counter != 0:  # 按当前间隔跳帧
                    continue

                frame = np.frombuffer(raw, np.uint8).reshape((self.height, self.width, 3))

                # 性能监控
                start_time = time.time()
                enhanced = self._apply_enhancement(frame)
                process_time = time.time() - start_time

                # 🔧 根据耗时调整跳帧策略
                if process_time > 0.06 and skip_interval < 6:
                    skip_interval += 1
                elif process_time < 0.03 and skip_interval > 2:
                    skip_interval -= 1

                # 🔧 先复制，再加锁（减少锁持有时间）
                original_copy = frame.copy()
                enhanced_copy = enhanced.copy()

                with self.lock:
                    self.original_frame = original_copy
                    self.enhanced_frame = enhanced_copy

                self._update_fps()

            except Exception as e:
                print(f"❌ [{self.camera_id}] 帧处理失败: {e}")
                import traceback
                traceback.print_exc()
                time.sleep(0.1)

    # =========================================================
    #  核心增强逻辑（整合 LUT + gamma + CLAHE + 锐化 + 除雾）
    # =========================================================
    def _apply_enhancement(self, frame: np.ndarray) -> np.ndarray:
        params = get_enhance_params()
        result = frame.copy()

        # --- 1. LUT 映射 ---
        if self.lut is not None and params.get("lut_enabled", True):
            lut_strength = params.get("lut_strength", 1.0)
            result = self._apply_lut(result, strength=lut_strength)

        # --- 2. Gamma 校正 ---
        gamma_value = params.get("gamma", 1.0)
        if gamma_value != 1.0:
            result = self._apply_gamma(result, gamma_value)

        # --- 3. CLAHE ---
        if params.get("clahe_enabled", True):
            clip = params.get("clahe_clip_limit", 2.0)
            grid = params.get("clahe_tile_grid_size", (8, 8))
            result = self._apply_clahe(result, clip, grid)

        # --- 4. 锐化 ---
        result = self._apply_sharpen(result)

        # --- 5. 简单除雾（可选）---
        #if params.get("defogging_enabled", True):
            #strength = params.get("defogging_strength", 0.3)
            #result = self._apply_defog(result, strength)

        return result

    # =========================================================
    # 增强算法：LUT
    # =========================================================
    def _apply_lut(self, image, strength=1.0):
        lut_uint8 = self.lut.astype(np.uint8)
        mapped = np.empty_like(image)

        for c in range(3):
            mapped[:, :, c] = cv2.LUT(image[:, :, c], lut_uint8[:, c])

        # 强度混合
        if strength < 1.0:
            return cv2.addWeighted(image, 1 - strength, mapped, strength, 0)

        return mapped

    # =========================================================
    # Gamma
    # =========================================================
    def _apply_gamma(self, img, gamma):
        inv = 1.0 / gamma
        table = np.array([(i / 255.0) ** inv * 255 for i in range(256)], dtype=np.uint8)
        return cv2.LUT(img, table)

    # =========================================================
    # CLAHE
    # =========================================================
    def _apply_clahe(self, img, clip_limit: float, tile_grid_size: tuple) -> np.ndarray:
        """应用 CLAHE 对比度增强"""
        # 更新 CLAHE 参数（如果变化）
        if (clip_limit != self.clahe.getClipLimit() or
                tile_grid_size != self.clahe.getTilesGridSize()):
            self.clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)

        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)

        l2 = self.clahe.apply(l)

        lab2 = cv2.merge((l2, a, b))
        return cv2.cvtColor(lab2, cv2.COLOR_LAB2BGR)

    # =========================================================
    # 锐化
    # =========================================================
    def _apply_sharpen(self, img):
        return cv2.filter2D(img, -1, self.sharpen_kernel)

    # =========================================================
    # 🔧 除雾（简单暗通道增强）
    # =========================================================
    #def _apply_defog(self, img, strength=0.2):
        #dark = np.min(img, axis=2)
        #dark = cv2.normalize(dark, None, 0, 255, cv2.NORM_MINMAX)


        #dark_bgr = cv2.cvtColor(dark, cv2.COLOR_GRAY2BGR)
        #return cv2.addWeighted(img, 1.0, dark_bgr, -strength, 0)

    # =========================================================
    # FPS
    # =========================================================
    def _update_fps(self):
        """更新 FPS 统计"""
        self.frame_count += 1
        current_time = time.time()

        if current_time - self.last_fps_time >= 1.0:  # 每秒更新一次
            self.current_fps = self.frame_count / (current_time - self.last_fps_time)
            self.frame_count = 0
            self.last_fps_time = current_time

    def get_original_frame(self) -> Optional[np.ndarray]:
        """获取原始帧"""
        with self.lock:
            return None if self.original_frame is None else self.original_frame.copy()

    def get_enhanced_frame(self) -> Optional[np.ndarray]:
        """获取增强后的帧"""
        with self.lock:
            return None if self.enhanced_frame is None else self.enhanced_frame.copy()

    def get_fps(self) -> float:
        """获取当前 FPS"""
        return self.current_fps

    def update_params(self, params: dict):
        from app.config.params import update_enhance_params
        update_enhance_params(**params)

    def stop(self):
        """停止处理器"""
        self.running = False
        self._terminate_proc()

        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2)
        self.thread = None

        print(f"🛑 [{self.camera_id}] 视频流处理器已停止")


class VideoStreamManager:

    def __init__(self):
        self.processors: Dict[str, VideoStreamProcessor] = {}
        self.lock = threading.Lock()
        print("🎛 视频流管理器初始化完成")

    def register_camera(self, camera_id, rtsp_url, lut_path=None, name=None, location=None):
        with self.lock:
            if camera_id in self.processors:
                print(f"⚠ 摄像头 {camera_id} 已存在，跳过注册")
                return

            processor = VideoStreamProcessor(camera_id, rtsp_url, lut_path)
            self.processors[camera_id] = processor
            print(f"📡 摄像头 {camera_id} 注册成功")

    def get_processor(self, camera_id):
        return self.processors.get(camera_id)

    def get_original_frame(self, camera_id: str) -> Optional[np.ndarray]:
        """获取原始帧"""
        p = self.get_processor(camera_id)
        return p.get_original_frame() if p else None

    def get_enhanced_frame(self, camera_id: str) -> Optional[np.ndarray]:
        """获取增强帧"""
        p = self.get_processor(camera_id)
        return p.get_enhanced_frame() if p else None

    def is_running(self, camera_id: str) -> bool:
        """检查摄像头是否在运行"""
        p = self.get_processor(camera_id)
        return p is not None and p.running

    def get_fps(self, camera_id: str) -> float:
        """获取摄像头 FPS"""
        p = self.get_processor(camera_id)
        return p.current_fps if p else 0.0

    def update_enhance_params(self, camera_id: str = None, params: dict = None):
        if camera_id:
            p = self.get_processor(camera_id)
            if p:
                p.update_params(params)
        else:
            for p in self.processors.values():
                p.update_params(params)

    def stop_processor(self, camera_id: str):
        """停止指定摄像头的处理器"""
        with self.lock:
            p = self.processors.pop(camera_id, None)
            if p:
                p.stop()
                print(f"✅ 摄像头 {camera_id} 已停止")

    def stop_all(self):
        with self.lock:
            for cid, p in list(self.processors.items()):
                p.stop()
            self.processors.clear()
        print("🛑 所有摄像头已停止")

