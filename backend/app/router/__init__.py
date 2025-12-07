# backend/app/router/__init__.py
from . import auth_router
from . import camera_router
from . import enhance_router
from . import settings_router
from . import video_stream_router

__all__ = [
    "auth_router",
    "camera_router",
    "enhance_router",
    "settings_router",
    "video_stream_router",
]
