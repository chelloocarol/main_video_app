// frontend/src/services/video.ts - 视频服务

import api from './api';

/**
 * API 响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * 视频流 URL 信息
 */
export interface VideoStreamUrl {
  camera_id: string;
  camera_name?: string;      //  摄像头名称
  camera_location?: string;  // 摄像头位置
  original_stream_url: string;
  enhanced_stream_url: string;
}

/**
 * 增强状态信息（仅用于显示，前端无法控制增强功能）
 */
export interface EnhancementStatus {
  is_running: boolean;
  camera_id?: string;
  fps?: number;
  params?: Record<string, any> | null;
  start_time?: string;
}


/**
 * 获取视频流 URL（对应后端 /api/video/stream）
 */
export const getVideoStreamUrl = async (
  cameraId?: string
): Promise<ApiResponse<VideoStreamUrl>> => {
  try {
    const params = cameraId ? { camera_id: cameraId } : {};
    const response = await api.get<VideoStreamUrl>('/api/video/stream', { params });
    return { success: true, data: response.data, message: '获取视频流 URL 成功' };
  } catch (error: any) {
    console.error('获取视频流 URL 失败:', error);
    return {
      success: false,
      data: null,
      message: error.response?.data?.detail || '获取视频流 URL 失败',
    };
  }
};

/**
 * 获取实时增强状态（仅用于显示，不用于调节）
 */
export const getEnhancementStatus = async (
  cameraId?: string
): Promise<ApiResponse<EnhancementStatus>> => {
  try {
    const params = cameraId ? { camera_id: cameraId } : {};
    const response = await api.get<EnhancementStatus>('/api/video/status', { params });
    return { success: true, data: response.data, message: '获取增强状态成功' };
  } catch (error: any) {
    console.error('获取增强状态失败:', error);
    return {
      success: false,
      data: { is_running: false },
      message: error.response?.data?.detail || '获取增强状态失败',
    };
  }
};


// 默认导出（方便统一引用）
export default {
  getVideoStreamUrl,
  getEnhancementStatus,
};