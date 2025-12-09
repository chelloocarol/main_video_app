// frontend/src/services/camera.ts - 摄像头服务

import api from './api';

/**
 * 摄像头信息接口
 */
export interface Camera {
  camera_id: string;
  name: string;
  location: string;
  lut_path: string;
  status: 'online' | 'offline';
  rtsp_url?: string;
}

/**
 * API 响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * 摄像头流信息
 */
export interface CameraStream {
  camera_id: string;
  original_stream_url: string;
  enhanced_stream_url: string;
  status: 'active' | 'inactive';
}

/**
 * 增强状态信息
 */
export interface EnhancementStatus {
  is_running: boolean;
  camera_id: string;
  fps?: number;
  params?: Record<string, any> | null;
  start_time?: string;
}


/**
 * 获取所有摄像头列表
 *
 * @returns Promise<Camera[]> 摄像头列表
 *
 * @example
 * ```typescript
 * const cameras = await getCameraList();
 * console.log('摄像头数量:', cameras.length);
 * ```
 */
export const getCameraList = async (): Promise<Camera[]> => {
  try {
    const response = await api.get<Camera[]>('/api/cameras');
    // ✅ 后端返回 { success, data, message }
    if (response.data && response.data.success) {
      return response.data.data; // ⬅ 取出真正的摄像头数组
    } else {
      throw new Error(response.data?.message || '获取摄像头列表失败');
    }

  } catch (error: any) {
    console.error('获取摄像头列表失败:', error);
    throw new Error(error.response?.data?.detail || '获取摄像头列表失败');
  }
};

/**
 * 获取单个摄像头信息
 *
 * @param cameraId - 摄像头 ID
 * @returns Promise<Camera> 摄像头详细信息
 *
 * @example
 * ```typescript
 * const camera = await getCameraById('1');
 * console.log('摄像头名称:', camera.name);
 * console.log('摄像头位置:', camera.location);
 * console.log('RTSP地址:', camera.rtsp_url);
 * ```
 */
export const getCameraById = async (cameraId: string): Promise<Camera> => {
  try {
    const response = await api.get<Camera>(`/api/cameras/${cameraId}`);
    return response.data;
  } catch (error: any) {
    console.error(`获取摄像头 ${cameraId} 信息失败:`, error);

    if (error.response?.status === 404) {
      throw new Error('摄像头不存在');
    }

    throw new Error(error.response?.data?.detail || '获取摄像头信息失败');
  }
};

/**
 * 获取摄像头视频流地址
 *
 * 获取原始 RTSP 流和增强后的流地址
 *
 * @param cameraId - 摄像头 ID
 * @returns Promise<CameraStream> 视频流信息
 *
 * @example
 * ```typescript
 * const stream = await getCameraStream('1');
 * console.log('原始流:', stream.original_stream_url);
 * console.log('增强流:', stream.enhanced_stream_url);
 * ```
 */
export const getCameraStream = async (cameraId: string): Promise<CameraStream> => {
  try {
    const response = await api.get<CameraStream>('/api/video/stream', {
      params: { camera_id: cameraId },
    });
    return response.data;
  } catch (error: any) {
    console.error(`获取摄像头 ${cameraId} 视频流失败:`, error);
    throw new Error(error.response?.data?.detail || '获取视频流失败');
  }
};

/**
 * 启动视频增强
 *
 * 对指定摄像头启动实时视频增强处理
 *
 * @param cameraId - 摄像头 ID
 * @returns Promise<EnhancementStatus> 增强状态
 *
 * @example
 * ```typescript
 * const status = await startEnhancement('1');
 * if (status.is_running) {
 *   console.log('视频增强已启动');
 * }
 * ```
 */
export const startEnhancement = async (cameraId: string): Promise<EnhancementStatus> => {
  try {
    const response = await api.post<EnhancementStatus>('/api/video/start', null, {
      params: { camera_id: cameraId },
    });
    return response.data;
  } catch (error: any) {
    console.error(`启动摄像头 ${cameraId} 增强失败:`, error);

    if (error.response?.status === 409) {
      throw new Error('视频增强已在运行中');
    }

    throw new Error(error.response?.data?.detail || '启动视频增强失败');
  }
};

/**
 * 停止视频增强
 *
 * 停止指定摄像头的视频增强处理
 *
 * @param cameraId - 摄像头 ID
 * @returns Promise<EnhancementStatus> 增强状态
 *
 * @example
 * ```typescript
 * const status = await stopEnhancement('1');
 * if (!status.is_running) {
 *   console.log('视频增强已停止');
 * }
 * ```
 */
export const stopEnhancement = async (cameraId: string): Promise<EnhancementStatus> => {
  try {
    const response = await api.post<EnhancementStatus>('/api/video/stop', null, {
      params: { camera_id: cameraId },
    });
    return response.data;
  } catch (error: any) {
    console.error(`停止摄像头 ${cameraId} 增强失败:`, error);

    if (error.response?.status === 400) {
      throw new Error('视频增强未在运行');
    }

    throw new Error(error.response?.data?.detail || '停止视频增强失败');
  }
};

/**
 * 检查摄像头增强状态
 *
 * @param cameraId - 摄像头 ID
 * @returns Promise<EnhancementStatus> 增强状态
 *
 * @example
 * ```typescript
 * const status = await getEnhancementStatus('1');
 * console.log('增强运行中:', status.is_running);
 * ```
 */
export const getEnhancementStatus = async (cameraId: string): Promise<EnhancementStatus> => {
  try {
    const response = await api.get<EnhancementStatus>('/api/video/status', {
      params: { camera_id: cameraId },
    });
    return response.data;
  } catch (error: any) {
    console.error(`获取摄像头 ${cameraId} 增强状态失败:`, error);
    throw new Error(error.response?.data?.detail || '获取增强状态失败');
  }
};

/**
 * 批量获取摄像头状态
 *
 * @param cameraIds - 摄像头 ID 数组
 * @returns Promise<Map<string, 'online' | 'offline'>> 摄像头状态映射
 *
 * @example
 * ```typescript
 * const statusMap = await getCamerasStatus(['1', '2', '3']);
 * console.log('摄像头1状态:', statusMap.get('1'));
 * ```
 */
export const getCamerasStatus = async (
  cameraIds: string[]
): Promise<Map<string, 'online' | 'offline'>> => {
  try {
    // 并发请求所有摄像头信息
    const promises = cameraIds.map(id => getCameraById(id).catch(() => null));
    const cameras = await Promise.all(promises);

    const statusMap = new Map<string, 'online' | 'offline'>();
    cameras.forEach((camera, index) => {
      if (camera) {
        statusMap.set(camera.camera_id, camera.status);
      } else {
        statusMap.set(cameraIds[index], 'offline');
      }
    });

    return statusMap;
  } catch (error: any) {
    console.error('批量获取摄像头状态失败:', error);
    throw new Error('批量获取摄像头状态失败');
  }
};

// 默认导出
export default {
  getCameraList,
  getCameraById,
  getCameraStream,
  startEnhancement,
  stopEnhancement,
  getEnhancementStatus,
  getCamerasStatus,
};