// frontend/src/store/settingsStore.ts - 系统设置状态管理
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  getSettings,
  updateSettings,
  resetSettings,
  validateSettings,
  DEFAULT_SETTINGS,
  type SystemSettings,
  type VideoSettings,
  type CoreSystemSettings,
  type NotificationSettings,
  type SettingsUpdateParams,
} from '../services/settings';

/**
 * 主题类型
 */
export type Theme = 'light' | 'dark' | 'auto';

/**
 * 语言类型
 */
export type Language = 'zh-CN' | 'en-US';


/**
 * 设置状态接口（完全无增强参数）
 */
export interface SettingsState {
  // 系统设置
  theme: Theme;
  language: Language;
  autoStart: boolean;
  saveLogs: boolean;
  logLevel: 'debug' | 'info' | 'warning' | 'error';

  // 视频设置
  defaultResolution: string;
  frameRate: number;
  quality: 'low' | 'medium' | 'high';

  // 通知设置
  enableEmail: boolean;
  enableSound: boolean;
  alertThreshold: number;

  // 完整的系统设置对象
  systemSettings: SystemSettings;

  // 状态标志
  isLoading: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  error: string | null;

  // 方法
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;

  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  updateMultipleSettings: (settings: Partial<SettingsState>) => void;

  clearError: () => void;
  markAsChanged: () => void;
  clearChanges: () => void;
}


/**
 * 系统设置 Store（持久化）
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // ============================================================================
      // 初始状态（无 enhancement）
      // ============================================================================

      theme: 'dark',
      language: 'zh-CN',

      autoStart: DEFAULT_SETTINGS.system.auto_start,
      saveLogs: DEFAULT_SETTINGS.system.save_logs,
      logLevel: DEFAULT_SETTINGS.system.log_level,

      defaultResolution: DEFAULT_SETTINGS.video.default_resolution,
      frameRate: DEFAULT_SETTINGS.video.frame_rate,
      quality: DEFAULT_SETTINGS.video.quality,

      enableEmail: DEFAULT_SETTINGS.notification.enable_email,
      enableSound: DEFAULT_SETTINGS.notification.enable_sound,
      alertThreshold: DEFAULT_SETTINGS.notification.alert_threshold,

      systemSettings: DEFAULT_SETTINGS,

      isLoading: false,
      isSaving: false,
      hasChanges: false,
      error: null,

      // ============================================================================
      // 从服务器加载设置（无 enhancement）
      // ============================================================================
      loadSettings: async () => {
        try {
          set({ isLoading: true, error: null });

          const result = await getSettings();
          if (result.success) {
            const s = result.data;

            set({
              autoStart: s.system?.auto_start ?? false,
              saveLogs: s.system?.save_logs ?? true,
              logLevel: s.system?.log_level ?? 'info',

              defaultResolution: s.video?.default_resolution ?? '1920x1080',
              frameRate: s.video?.frame_rate ?? 30,
              quality: s.video?.quality ?? 'high',

              enableEmail: s.notification?.enable_email ?? false,
              enableSound: s.notification?.enable_sound ?? true,
              alertThreshold: s.notification?.alert_threshold ?? 80,

              systemSettings: s,
              isLoading: false,
              hasChanges: false,
              error: null,
            });

            console.log('✓ 设置加载成功');
          } else {
            set({
              isLoading: false,
              error: result.message || '加载设置失败',
            });
          }
        } catch (error: any) {
          console.error('✗ 加载设置失败:', error);
          set({
            isLoading: false,
            error: error.message || '加载设置失败',
          });
        }
      },

      // ============================================================================
      // 保存设置（自动过滤 enhancement）
      // ============================================================================
      saveSettings: async () => {
        try {
          set({ isSaving: true, error: null });

          const state = get();

          const payload: SettingsUpdateParams = {
            system: {
              auto_start: state.autoStart,
              save_logs: state.saveLogs,
              log_level: state.logLevel,
            },
            video: {
              default_resolution: state.defaultResolution,
              frame_rate: state.frameRate,
              quality: state.quality,
            },
            notification: {
              enable_email: state.enableEmail,
              enable_sound: state.enableSound,
              alert_threshold: state.alertThreshold,
            },
          };

          const validation = validateSettings(payload);
          if (!validation.valid) {
            set({
              isSaving: false,
              error: validation.errors.join('; '),
            });
            return;
          }

          const result = await updateSettings(payload);

          if (result.success) {
            set({
              isSaving: false,
              hasChanges: false,
              systemSettings: result.data,
              error: null,
            });
            console.log('✓ 设置保存成功');
          } else {
            set({
              isSaving: false,
              error: result.message || '保存设置失败',
            });
          }
        } catch (error: any) {
          console.error('✗ 保存设置失败:', error);
          set({
            isSaving: false,
            error: error.message || '保存设置失败',
          });
        }
      },

      // ============================================================================
      // 更新本地设置
      // ============================================================================
      updateSetting: (key, value) => {
        set({
          [key]: value,
          hasChanges: true,
        });
      },

      updateMultipleSettings: (settings) => {
        set((state) => ({
          ...state,
          ...settings,
          hasChanges: true,
        }));
      },

      clearError: () => set({ error: null }),

      markAsChanged: () => set({ hasChanges: true }),

      clearChanges: () => set({ hasChanges: false }),
    }),

    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
/**
 * 获取主题设置
 */
export const useTheme = () => useSettingsStore((state) => state.theme);

/**
 * 获取语言设置
 */
export const useLanguage = () => useSettingsStore((state) => state.language);

/**
 * 获取系统设置
 */
export const useSystemSettings = () => useSettingsStore((state) => ({
  autoStart: state.autoStart,
  saveLogs: state.saveLogs,
  logLevel: state.logLevel,
}));

/**
 * 获取视频设置
 */
export const useVideoSettings = () => useSettingsStore((state) => ({
  defaultResolution: state.defaultResolution,
  frameRate: state.frameRate,
  quality: state.quality,
}));

/**
 * 获取通知设置
 */
export const useNotificationSettings = () => useSettingsStore((state) => ({
  enableEmail: state.enableEmail,
  enableSound: state.enableSound,
  alertThreshold: state.alertThreshold,
}));

/**
 * 获取状态标志
 */
export const useSettingsStatus = () => useSettingsStore((state) => ({
  isLoading: state.isLoading,
  isSaving: state.isSaving,
  hasChanges: state.hasChanges,
  error: state.error,
}));

/**
 * 获取设置控制方法
 */
export const useSettingsActions = () => {
  const updateSetting = useSettingsStore((state) => state.updateSetting);
  const saveSettings = useSettingsStore((state) => state.saveSettings);
  return { updateSetting, saveSettings, resetToDefaults, applyPreset };
};

// 默认导出
export default useSettingsStore;