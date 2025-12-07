// frontend/src/store/videoStore.ts - 视频播放状态管理

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  getVideoStreamUrl,
  getEnhancementStatus,
  type VideoStreamUrl,
} from '../services/video';

/**
 * 视频播放状态接口
 */
interface VideoState {
  // 播放状态
  isPlaying: boolean;
   // 前端不再允许控制增强，只用于展示增强状态
  isEnhanced: boolean;
  isPaused: boolean;

  // 视频 URL
  videoUrl: string | null;
  originalStreamUrl: string | null;
  enhancedStreamUrl: string | null;

  // 当前摄像头
  currentCameraId: string | null;
  currentCameraName: string | null;

  // 加载和错误状态
  isLoading: boolean;
  error: string | null;

  // 统计信息
  fps: number;
  bitrate: number;
  resolution: string;

  // 方法
  togglePlay: () => void;
  setVideoUrl: (url: string) => void;
  setStreamUrls: (urls: VideoStreamUrl) => void;
  loadVideoStream: (cameraId: string, cameraName?: string) => Promise<void>;
  setCurrentCamera: (cameraId: string, cameraName?: string) => void;
  clearError: () => void;
  reset: () => void;
}

/**
 * 视频播放状态管理 Store
 */
export const useVideoStore = create<VideoState>()(
  persist(
    (set, get) => ({
      // ============================================================================
      // 初始状态
      // ============================================================================

      isPlaying: false,
      isEnhanced: false,
      isPaused: false,

      videoUrl: null,
      originalStreamUrl: null,
      enhancedStreamUrl: null,

      currentCameraId: null,
      currentCameraName: null,

      isLoading: false,

      error: null,

      fps: 0,
      bitrate: 0,
      resolution: '',

      // ============================================================================
      // 方法实现
      // ============================================================================

      /**
       * 切换播放/暂停状态
       */
      togglePlay: () => {
        set((state) => ({
          isPlaying: !state.isPlaying,
          isPaused: state.isPlaying,
        }));
      },

      /**
       * 设置视频 URL
       */
      setVideoUrl: (url: string) => {
        set({ videoUrl: url });
      },

      /**
       * 设置视频流 URLs
       */
      setStreamUrls: (urls: VideoStreamUrl) => {
        set({
          originalStreamUrl: urls.original_stream_url,
          enhancedStreamUrl: urls.enhanced_stream_url,
          videoUrl: urls.original_stream_url,
          currentCameraId: urls.camera_id || null,
          currentCameraName: urls.camera_name || null,
        });
      },

      /**
       * 加载视频流
       * ✔ 保留增强状态读取（只读）
       */
      loadVideoStream: async (cameraId: string, cameraName?: string) => {
        try {
          set({ isLoading: true, error: null });

          const result = await getVideoStreamUrl(cameraId);

          if (result.success) {
            set({
              originalStreamUrl: result.data.original_stream_url,
              enhancedStreamUrl: result.data.enhanced_stream_url,
              videoUrl: result.data.original_stream_url,
              currentCameraId: cameraId,
              currentCameraName: cameraName || result.data.camera_name || null,
              isLoading: false,
              error: null,
            });

            // ✔ 只读增强状态
            const statusResult = await getEnhancementStatus(cameraId);
            if (statusResult.success) {
              set({ isEnhanced: statusResult.data.is_running });
            }

          } else {
            set({
              isLoading: false,
              error: result.message || '加载视频流失败',
            });
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || '加载视频流失败',
          });
        }
      },

      setCurrentCamera: (cameraId: string, cameraName?: string) => {
        set({
          currentCameraId: cameraId,
          currentCameraName: cameraName || null,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      // 保留 reset，但不会影响增强控制
      reset: () => {
        set({
          isPlaying: false,
          isPaused: false,
          error: null,
        });
      },
    }),

    {
      name: 'video-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============================================================================
// Hook 导出
// ============================================================================
/**
 * 获取播放状态
 */
export const useIsPlaying = () => useVideoStore((state) => state.isPlaying);

/**
 * 前端可读增强状态（来自后端）
 */
export const useIsEnhanced = () => useVideoStore((state) => state.isEnhanced);

/**
 * 获取视频流 URLs
 */
export const useStreamUrls = () => useVideoStore((state) => ({
  originalStreamUrl: state.originalStreamUrl,
  enhancedStreamUrl: state.enhancedStreamUrl,
}));

/**
 * 获取当前摄像头信息
 */
export const useCurrentCamera = () => useVideoStore((state) => ({
  cameraId: state.currentCameraId,
  cameraName: state.currentCameraName,
}));


/**
 * 获取加载状态
 */
export const useVideoLoading = () => useVideoStore((state) => ({
  isLoading: state.isLoading,
}));

/**
 * 获取错误信息
 */
export const useVideoError = () => useVideoStore((state) => state.error);

/**
 * 获取播放控制方法
 */
export const useVideoControls = () => {
  const togglePlay = useVideoStore((state) => state.togglePlay);
  const isPlaying = useVideoStore((state) => state.isPlaying);
  const isEnhanced = useVideoStore((state) => state.isEnhanced);

  return { togglePlay,  isPlaying, isEnhanced };
};

// 默认导出
export default useVideoStore;