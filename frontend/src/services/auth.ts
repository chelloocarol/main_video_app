// frontend/src/services/auth.ts - 认证服务

import api from './api';

/**
 * 用户信息接口定义
 */
export interface User {
  id: string;
  username: string;
  full_name?: string;
  email?: string;
  role: 'admin' | 'operator' | 'viewer';
  is_active: boolean;
  created_at?: string;
}

/**
 * 登录响应接口定义
 */
export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

/**
 * 用户登录
 *
 * @param username - 用户名
 * @param password - 密码
 * @returns Promise<LoginResponse> 包含 token 和用户信息
 *
 * @example
 * ```typescript
 * const result = await login('admin', '123456');
 * console.log(result.access_token);
 * ```
 */
export const login = async (
  username: string,
  password: string
): Promise<LoginResponse> => {
  try {
    // 构造表单数据（OAuth2 标准格式）
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    // 调用登录接口
    const response = await api.post<{ access_token: string; token_type: string }>(
      '/api/token',
      formData,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    // 保存 token 到 localStorage
    const { access_token, user } = response.data;
    localStorage.setItem('access_token', access_token);

    // ✅ 登录后再拉取用户信息
    const userInfo = await getUserInfo();
    localStorage.setItem('user_info', JSON.stringify(userInfo));

    // ✅ 构造 LoginResponse 格式（方便调用端兼容）
    return {
      access_token,
      token_type: 'bearer',
      user: userInfo,
    };
  } catch (error: any) {
    console.error('登录失败:', error);

    if (error.response?.status === 401) {
      throw new Error('用户名或密码错误');
    } else if (error.response?.status === 403) {
      throw new Error('账户已被禁用');
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      throw new Error('无法连接到服务器，请检查网络');
    } else {
      throw new Error(error.response?.data?.detail || '登录失败，请稍后重试');
    }
  }
};

/**
 * 用户退出登录
 *
 * 清除本地存储的认证信息
 *
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * await logout();
 * // 跳转到登录页
 * navigate('/login');
 * ```
 */
export const logout = async (): Promise<void> => {
  try {
    // 调用后端登出接口（可选）
    try {
      await api.post('/api/logout');
    } catch (error) {
      // 即使后端登出失败，也继续清除本地数据
      console.warn('后端登出接口调用失败:', error);
    }

    // 清除 localStorage 中的认证信息
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('remember_user');

    console.log('用户已退出登录');
  } catch (error) {
    console.error('退出登录失败:', error);

    // 即使出错也清除本地数据
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('remember_user');

    throw error;
  }
};

/**
 * 获取当前登录用户信息
 *
 * @returns Promise<User> 用户详细信息
 *
 * @example
 * ```typescript
 * const user = await getUserInfo();
 * console.log(user.username, user.role);
 * ```
 */
export const getUserInfo = async (): Promise<User> => {
  try {
    // 调用用户信息接口
    const response = await api.get<User>('/api/user/me');

    // 更新本地缓存的用户信息
    localStorage.setItem('user_info', JSON.stringify({
      username: response.data.username,
      full_name: response.data.full_name,
      role: response.data.role,
    }));

    return response.data;
  } catch (error: any) {
    console.error('获取用户信息失败:', error);

    // 如果是 401 错误，token 可能已过期
    if (error.response?.status === 401) {
      // 清除本地数据
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_info');
      throw new Error('登录已过期，请重新登录');
    }

    throw new Error(error.response?.data?.detail || '获取用户信息失败');
  }
};

/**
 * 检查用户是否已登录
 *
 * @returns boolean 是否已登录
 *
 * @example
 * ```typescript
 * if (isAuthenticated()) {
 *   // 用户已登录
 * }
 * ```
 */
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('access_token');
  return !!token;
};

/**
 * 获取本地缓存的用户信息（不发送请求）
 *
 * @returns User | null 缓存的用户信息
 *
 * @example
 * ```typescript
 * const cachedUser = getCachedUserInfo();
 * if (cachedUser) {
 *   console.log(cachedUser.username);
 * }
 * ```
 */
export const getCachedUserInfo = (): Partial<User> | null => {
  try {
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      return JSON.parse(userInfo);
    }
    return null;
  } catch (error) {
    console.error('解析缓存用户信息失败:', error);
    return null;
  }
};

/**
 * 获取当前 token
 *
 * @returns string | null token 字符串
 */
export const getToken = (): string | null => {
  return localStorage.getItem('access_token');
};

/**
 * 验证 token 是否有效（可选功能）
 *
 * @returns Promise<boolean> token 是否有效
 */
export const validateToken = async (): Promise<boolean> => {
  try {
    await getUserInfo();
    return true;
  } catch (error) {
    return false;
  }
};

// 默认导出
export default {
  login,
  logout,
  getUserInfo,
  isAuthenticated,
  getCachedUserInfo,
  getToken,
  validateToken,
};