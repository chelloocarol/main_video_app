// frontend/src/store/index.ts - Store 统一导出

/**
 * 用户状态管理
 */
export {
  useUserStore,
  useIsLoggedIn,
  useCurrentUser,
  useToken,
  useUserLoading,
  useUserError,
  useAuth,
} from './userStore';

export type { default as UserState } from './userStore';

/**
 * 视频播放状态管理
 */
export {
  useVideoStore,
  useIsPlaying,
  useIsEnhanced,
  useStreamUrls,
  useCurrentCamera,
  useVideoLoading,
  useVideoError,
  useVideoControls,
} from './videoStore';

export type { default as VideoState } from './videoStore';

/**
 * 系统设置状态管理
 */
export {
  useSettingsStore,
  useTheme,
  useLanguage,
  useSystemSettings,
  useVideoSettings,
  useNotificationSettings,
  useSettingsStatus,
  useSettingsActions,
} from './settingsStore';

export type { Theme, Language, default as SettingsState } from './settingsStore';

