// frontend/src/services/settings.ts - 设置服务
/**
 * ⚙️ 系统设置管理模块（区别于 video.ts）
 * 本模块用于「持久化」保存系统配置，如增强参数默认值、视频质量、通知开关等。
 * 而 video.ts 负责实时视频流控制（临时增强，不写入磁盘）。
 */

import api from './api';

/**
 * API 响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

/* ============================================================
 * 一、类型定义
 * ============================================================
 */

/**
 * 视频设置
 */
export interface VideoSettings {
  default_resolution?: string; // 默认分辨率（如 '1920x1080'）
  frame_rate?: number; // 帧率
  quality?: 'low' | 'medium' | 'high'; // 视频质量等级
}

/**
 * 系统通用设置
 */
export interface CoreSystemSettings {
  auto_start?: boolean; // 自动启动增强
  save_logs?: boolean; // 是否保存日志
  log_level?: 'debug' | 'info' | 'warning' | 'error'; // 日志级别
}

/**
 * 通知设置
 */
export interface NotificationSettings {
  enable_email?: boolean;
  enable_sound?: boolean;
  alert_threshold?: number;
}

/**
 * 系统总配置结构
 */
export interface SystemSettings {
  video?: VideoSettings;
  system?: CoreSystemSettings;
  [key: string]: any;
}

/**
 * 设置更新参数
 */
export interface SettingsUpdateParams {
  enhancement?: Partial<EnhancementSettings>;
  video?: Partial<VideoSettings>;
  system?: Partial<CoreSystemSettings>;
  [key: string]: any;
}

/* ============================================================
 * 二、默认配置
 * ============================================================
 */

/**
 * 默认设置配置
 */
export const DEFAULT_SETTINGS = {
  video: {
    default_resolution: '1920x1080',
    frame_rate: 30,
    quality: 'high',
  },
  system: {
    auto_start: false,
    save_logs: true,
    log_level: 'info',
  },
  notification: {
    enable_email: false,
    enable_sound: true,
    alert_threshold: 80,
  },
};

/* ============================================================
 * 三、API 调用函数
 * ============================================================
 */

/**
 * 获取系统设置
 */
export const getSettings = async (): Promise<ApiResponse<SystemSettings>> => {
  try {
    const response = await api.get<SystemSettings>('/api/settings/get');

    // 使用默认配置补齐缺失字段
    const settings: SystemSettings = {
      video: { ...DEFAULT_SETTINGS.video, ...response.data.video },
      system: { ...DEFAULT_SETTINGS.system, ...response.data.system },
      notification: { ...DEFAULT_SETTINGS.notification, ...response.data.notification },
      ...response.data,
    };

    return { success: true, data: settings, message: '获取设置成功' };
  } catch (error: any) {
    console.error('获取设置失败:', error);
    return {
      success: false,
      data: DEFAULT_SETTINGS,
      message: error.response?.data?.detail || '获取设置失败，使用默认配置',
    };
  }
};

/**
 * 更新系统设置
 */
export const updateSettings = async (
  params: SettingsUpdateParams
): Promise<ApiResponse<SystemSettings>> => {
  try {
    const response = await api.post<SystemSettings>('/api/settings/update', params);
    return { success: true, data: response.data, message: '设置更新成功' };
  } catch (error: any) {
    console.error('更新设置失败:', error);

    let errorMessage = '更新设置失败';
    if (error.response?.status === 400) errorMessage = '参数错误，请检查输入';
    else if (error.response?.status === 403) errorMessage = '权限不足，无法更新设置';
    else if (error.response?.status === 500) errorMessage = '服务器内部错误，请稍后重试';
    else if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK')
      errorMessage = '无法连接到服务器';
    else errorMessage = error.response?.data?.detail || errorMessage;

    return { success: false, data: null, message: errorMessage };
  }
};

/**
 * 重置为默认设置
 */
export const resetSettings = async (): Promise<ApiResponse<SystemSettings>> => {
  try {
    const response = await api.post<SystemSettings>('/api/settings/reset');
    return { success: true, data: response.data, message: '设置已重置为默认值' };
  } catch (error: any) {
    console.error('重置设置失败:', error);
    return {
      success: false,
      data: DEFAULT_SETTINGS,
      message: error.response?.data?.detail || '重置设置失败',
    };
  }
};

/* ============================================================
 * 四、验证逻辑
 * ============================================================
 */

/**
 *  验证设置参数是否有效（仅视频 + 系统 + 通知）
 */
export const validateSettings = (
  params: SettingsUpdateParams
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // 视频参数
  if (params.video?.frame_rate !== undefined) {
    if (params.video.frame_rate < 1 || params.video.frame_rate > 120)
      errors.push('帧率必须在 1 到 120 之间');
  }

  return { valid: errors.length === 0, errors };
};


/* ============================================================
 * 五、导入 / 导出工具
 * ============================================================
 */

/**
 * 导出设置为json文件
 */
export const exportSettings = (
  settings: SystemSettings,
  filename = 'system-settings.json'
): void => {
  try {
    // 只导出非增强内容
    const cleanSettings = {
      video: settings.video,
      system: settings.system,
      notification: settings.notification,
    };

    const blob = new Blob([JSON.stringify(cleanSettings, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    console.log('设置导出成功');
  } catch (error) {
    console.error('导出设置失败:', error);
  }
};

/**
 * 从文件导入设置
 */

export const importSettings = (
  file: File
): Promise<SystemSettings> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        // 过滤掉 enhancement 字段
        const clean = {
          video: json.video,
          system: json.system,
          notification: json.notification,
        };
        resolve(clean);
      } catch {
        reject(new Error('设置文件格式错误'));
      }
    };
    reader.onerror = () => reject(new Error('读取设置文件失败'));
    reader.readAsText(file);
  });

/* ============================================================
 * 七、默认导出
 * ============================================================
 */
export default {
  getSettings,
  updateSettings,
  resetSettings,
  validateSettings,
  exportSettings,
  importSettings,
  DEFAULT_SETTINGS,
};