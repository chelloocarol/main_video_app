// frontend/src/store/userStore.ts - 用户状态管理

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { login as apiLogin, logout as apiLogout, getUserInfo } from '../services/auth';
import type { User } from '../services/auth';

/**
 * 用户状态接口
 */
interface UserState {
  // 状态
  token: string | null;
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;

  // 方法
  login: (username: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setToken: (token: string) => void;
  clearError: () => void;
  initialize: () => Promise<void>;
}

/**
 * 用户状态管理 Store
 *
 * 使用 Zustand 进行状态管理，并持久化到 localStorage
 */
export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // ============================================================================
      // 初始状态
      // ============================================================================

      token: null,
      user: null,
      isLoggedIn: false,
      isLoading: false,
      error: null,

      // ============================================================================
      // 方法实现
      // ============================================================================

      /**
       * 用户登录
       *
       * @param username - 用户名
       * @param password - 密码
       * @param remember - 是否记住我
       */
      login: async (username: string, password: string, remember: boolean = false) => {
        try {
          set({ isLoading: true, error: null });

          // 调用登录 API
          const result = await apiLogin(username, password);

          // 更新状态
          set({
            token: result.access_token,
            user: result.user,
            isLoggedIn: true,
            isLoading: false,
            error: null,
          });

          // 如果勾选"记住我"，保存额外信息
          if (remember) {
            localStorage.setItem('remember_user', JSON.stringify({
              username: result.user.username,
              full_name: result.user.full_name,
            }));
          } else {
            localStorage.removeItem('remember_user');
          }

          console.log('✓ 用户登录成功:', result.user.username);
        } catch (error: any) {
          console.error('✗ 用户登录失败:', error);

          set({
            token: null,
            user: null,
            isLoggedIn: false,
            isLoading: false,
            error: error.message || '登录失败',
          });

          throw error;
        }
      },

      /**
       * 用户退出登录
       🔧 修复：确保完全清理状态和本地存储
       */
      logout: async () => {
        try {
          console.log('🚪 开始退出登录...');
          set({ isLoading: true, error: null });

          // 1. 调用后端登出接口（即使失败也继续清理）
          try {
            await apiLogout();
            console.log('✓ 后端登出成功');
          } catch (error) {
            console.warn('⚠️ 后端登出接口调用失败（继续清理本地状态）:', error);
          }

          // 2. 清除 Zustand 状态
          set({
            token: null,
            user: null,
            isLoggedIn: false,
            isLoading: false,
            error: null,
          });

          // 3. 清除 localStorage 中的所有认证信息
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_info');
          localStorage.removeItem('remember_user');

          // 4. 清除 Zustand 持久化存储
          localStorage.removeItem('user-storage');

          // 5. 清除 sessionStorage（如果有）
          sessionStorage.clear();

          console.log('✓ 用户状态已完全清理');
          console.log('✓ 退出登录成功');

          // 🔧 返回成功标识
          return Promise.resolve();

        } catch (error: any) {
          console.error('✗ 退出登录过程出错:', error);

          // 即使出错也强制清除本地状态
          set({
            token: null,
            user: null,
            isLoggedIn: false,
            isLoading: false,
            error: null,
          });

          localStorage.removeItem('access_token');
          localStorage.removeItem('user_info');
          localStorage.removeItem('remember_user');
          localStorage.removeItem('user-storage');
          sessionStorage.clear();

          // 不抛出错误，确保用户能退出
          return Promise.resolve();
        }
      },

      /**
       * 刷新用户信息
       */
      refreshUser: async () => {
        try {
          const { token } = get();

          if (!token) {
            throw new Error('未登录');
          }

          set({ isLoading: true, error: null });

          const user = await getUserInfo();

          set({
            user,
            isLoading: false,
            error: null,
          });

          console.log('✓ 用户信息刷新成功');
        } catch (error: any) {
          console.error('✗ 刷新用户信息失败:', error);

          if (error.message?.includes('登录已过期')) {
            set({
              token: null,
              user: null,
              isLoggedIn: false,
              isLoading: false,
              error: '登录已过期，请重新登录',
            });
          } else {
            set({
              isLoading: false,
              error: error.message || '刷新用户信息失败',
            });
          }

          throw error;
        }
      },

      /**
       * 设置 Token
       */
      setToken: (token: string) => {
        set({
          token,
          isLoggedIn: true,
        });

        get().refreshUser().catch(console.error);
      },

      /**
       * 清除错误信息
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * 初始化
       */
      initialize: async () => {
        try {
          const { token } = get();

          if (!token) {
            set({ isLoggedIn: false, isLoading: false });
            return;
          }

          set({ isLoading: true });

          const user = await getUserInfo();

          set({
            user,
            isLoggedIn: true,
            isLoading: false,
            error: null,
          });

          console.log('✓ 用户状态初始化成功');
        } catch (error: any) {
          console.error('✗ 用户状态初始化失败:', error);

          set({
            token: null,
            user: null,
            isLoggedIn: false,
            isLoading: false,
            error: null,
          });
        }
      },
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isLoggedIn: state.isLoggedIn,
      }),
    }
  )
);

/**
 * 导出辅助 Hooks
 */

/**
 * 获取用户登录状态
 */
export const useIsLoggedIn = () => useUserStore((state) => state.isLoggedIn);

/**
 * 获取当前用户信息
 */
export const useCurrentUser = () => useUserStore((state) => state.user);

/**
 * 获取 Token
 */
export const useToken = () => useUserStore((state) => state.token);

/**
 * 获取加载状态
 */
export const useUserLoading = () => useUserStore((state) => state.isLoading);

/**
 * 获取错误信息
 */
export const useUserError = () => useUserStore((state) => state.error);

/**
 * 获取登录和退出方法
 */
export const useAuth = () => {
  const login = useUserStore((state) => state.login);
  const logout = useUserStore((state) => state.logout);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);

  return { login, logout, isLoggedIn };
};

// 默认导出
export default useUserStore;