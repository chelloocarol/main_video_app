# backend/build_backend.py
import PyInstaller.__main__
import os
import sys
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIST = os.path.abspath(os.path.join(BASE_DIR, "../frontend/dist"))

print("=" * 70)
print("📦 后端打包脚本启动")
print("=" * 70)
print(f"📂 后端目录: {BASE_DIR}")
print(f"📂 前端 dist: {FRONTEND_DIST}")


# ============================================================================
# 🔍 步骤1：检测 OpenCV 文件
# ============================================================================
def find_opencv_dlls():
    """查找虚拟环境中的 OpenCV DLL 文件"""
    try:
        import cv2
        cv2_path = os.path.dirname(cv2.__file__)
        print(f"\n✅ 找到 cv2 包路径: {cv2_path}")

        dlls = []
        for file in os.listdir(cv2_path):
            if file.endswith('.dll') or file.endswith('.pyd'):
                full_path = os.path.join(cv2_path, file)
                size_mb = os.path.getsize(full_path) / (1024 * 1024)
                dlls.append(full_path)
                print(f"   📦 {file:<45} ({size_mb:.2f} MB)")

        if not dlls:
            print("⚠️ 警告：cv2 包中没有找到 DLL/PYD 文件")

        return cv2_path, dlls
    except ImportError:
        print("❌ 无法导入 cv2，请确保已安装 opencv-python")
        sys.exit(1)


cv2_path, opencv_files = find_opencv_dlls()

# ============================================================================
# 步骤2：前端静态资源
# ============================================================================
add_data_options = [f"{FRONTEND_DIST};frontend/dist"]

if os.path.exists(FRONTEND_DIST):
    for item in os.listdir(FRONTEND_DIST):
        full_path = os.path.join(FRONTEND_DIST, item)
        if os.path.isdir(full_path):
            add_data_options.append(f"{full_path};frontend/dist/{item}")
        else:
            add_data_options.append(f"{full_path};frontend/dist")

print("\n📦 前端静态资源打包项:")
for item in add_data_options:
    print(f"   • {item}")

# ============================================================================
# 步骤3：OpenCV 文件打包选项
# ============================================================================
opencv_binary_options = []
for dll in opencv_files:
    # 🔧 关键：使用 '.' 表示放到 EXE 同级目录
    opencv_binary_options.append(f"--add-binary={dll};.")

print("\n🔥 OpenCV DLL 打包选项:")
for opt in opencv_binary_options:
    print(f"   • {opt}")

# ============================================================================
# 步骤4：配置文件策略
# ============================================================================
print("\n⚠️ 配置文件策略:")
print("   • rtsp.json - 不打包（需手动放置到 config/）")
print("   • users.json - 不打包（需手动放置到 data/）")
print("   • camera_info.json - 不打包（需手动放置）")
print("   • .env - 不打包（需手动放置）")
print("    • LUT (*.npy) - 不打包（需手动放置到 lut/）")

# ============================================================================
# 步骤5：PyInstaller 打包
# ============================================================================
pyinstaller_args = [
                       'app/main.py',
                       '--name=video_backend',
                       '--onedir',
                       '--noconfirm',
                       '--log-level=WARN',
                       '--noupx',

                       # 后端模块
                       '--add-data=app/router;app/router',
                       '--add-data=app/utils;app/utils',


                   ] + [f'--add-data={item}' for item in add_data_options] + opencv_binary_options + [

                       # Python 依赖
                       '--hidden-import=uvicorn',
                       '--hidden-import=uvicorn.logging',
                       '--hidden-import=uvicorn.loops',
                       '--hidden-import=uvicorn.loops.auto',
                       '--hidden-import=uvicorn.protocols',
                       '--hidden-import=uvicorn.protocols.http',
                       '--hidden-import=uvicorn.protocols.http.auto',
                       '--hidden-import=uvicorn.protocols.websockets',
                       '--hidden-import=uvicorn.protocols.websockets.auto',
                       '--hidden-import=uvicorn.lifespan',
                       '--hidden-import=uvicorn.lifespan.on',
                       '--hidden-import=passlib.handlers.bcrypt',
                       '--hidden-import=cv2',
                       '--hidden-import=numpy',
                       '--hidden-import=numpy.core._multiarray_umath',
                       '--collect-submodules=cv2',
                       '--collect-submodules=numpy',
                   ]

print("\n" + "=" * 70)
print("🚀 步骤6：开始 PyInstaller 打包...")
print("=" * 70)

PyInstaller.__main__.run(pyinstaller_args)

# ============================================================================
# 🔥 步骤7：打包后处理 - 强制复制 OpenCV 文件
# ============================================================================
print("\n" + "=" * 70)
print("📦 步骤7：后处理 - 复制 OpenCV 文件到 EXE 目录")
print("=" * 70)

dist_dir = os.path.join(BASE_DIR, "dist", "video_backend")

if not os.path.exists(dist_dir):
    print(f"❌ 错误：输出目录不存在 - {dist_dir}")
    sys.exit(1)

# 强制复制每个 OpenCV 文件
copy_success = 0
copy_failed = 0

for opencv_file in opencv_files:
    filename = os.path.basename(opencv_file)
    dest_path = os.path.join(dist_dir, filename)

    try:
        # 强制覆盖复制
        shutil.copy2(opencv_file, dest_path)

        # 验证复制结果
        if os.path.exists(dest_path):
            dest_size = os.path.getsize(dest_path) / (1024 * 1024)
            print(f"✅ 复制成功: {filename:<45} ({dest_size:.2f} MB)")
            copy_success += 1
        else:
            print(f"❌ 复制失败: {filename} (文件不存在)")
            copy_failed += 1

    except Exception as e:
        print(f"❌ 复制异常: {filename} - {e}")
        copy_failed += 1

# 统计
print(f"\n📊 复制统计:")
print(f"   ✅ 成功: {copy_success} 个")
print(f"   ❌ 失败: {copy_failed} 个")

# ============================================================================
# 步骤8：验证最终文件结构
# ============================================================================
print("\n" + "=" * 70)
print("🔍 步骤8：验证最终文件结构")
print("=" * 70)

print(f"\n📂 EXE 目录: {dist_dir}")
print("\n文件列表:")

# 列出 EXE 同级目录的所有文件
for item in sorted(os.listdir(dist_dir)):
    item_path = os.path.join(dist_dir, item)
    if os.path.isdir(item_path):
        print(f"   📁 {item}/")
    else:
        size_mb = os.path.getsize(item_path) / (1024 * 1024)
        print(f"   📄 {item:<45} ({size_mb:.2f} MB)")

# 检查关键文件
print("\n🔍 关键文件检查:")
critical_files = [
    "video_backend.exe",
    "cv2.pyd",
    "opencv_videoio_ffmpeg481_64.dll"
]

for file in critical_files:
    file_path = os.path.join(dist_dir, file)
    if os.path.exists(file_path):
        size_mb = os.path.getsize(file_path) / (1024 * 1024)
        print(f"   ✅ {file:<45} ({size_mb:.2f} MB)")
    else:
        print(f"   ❌ {file:<45} 缺失！")

# ============================================================================
# 步骤9：创建配置目录
# ============================================================================
config_dir = os.path.join(dist_dir, "config")
data_dir = os.path.join(dist_dir, "data")
lut_dir = os.path.join(dist_dir, "lut")
os.makedirs(config_dir, exist_ok=True)
os.makedirs(data_dir, exist_ok=True)
os.makedirs(lut_dir, exist_ok=True)
print(f"\n✅ 配置目录已创建: {config_dir}")
print(f"✅ 数据目录已创建: {data_dir}")
print(f"✅ 数据目录已创建: {lut_dir}")

# ============================================================================
# 完成提示
# ============================================================================
print("\n" + "=" * 70)
print("✅ 打包完成！")
print("=" * 70)

print("\n📋 后续步骤:")
print(f"1. 复制配置文件:")
print(f"   Copy-Item 'app\\config\\rtsp.json' '{config_dir}\\'")
print(f"   Copy-Item 'app\\config\\camera_info.json' '{config_dir}\\'")
print(f"   Copy-Item 'data\\users.json' '{data_dir}\\'")
print(f"   Copy-Item 'app\\lut\\*.npy' '{lut_dir}\\'")
print(f"   Copy-Item '.env' '{dist_dir}\\'")
print(f"\n2. 测试运行:")
print(f"   cd '{dist_dir}'")
print(f"   .\\video_backend.exe --debug-env")

print("=" * 70)