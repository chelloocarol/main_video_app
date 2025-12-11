// frontend/src/services/api.ts
// Axios 实例配置文件 —— 不导入其他 service，避免循环依赖

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const resolveBaseURL = (): string => {
  const normalize = (url: string) => url.replace(/\/+$/, '');
  const envUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : '';

  // 1) 显式配置优先，但如果指向客户端 localhost/127 且当前页面并非该主机，则改用同源
  if (envUrl) {
    try {
      const env = new URL(envUrl);
      if (origin) {
        const current = new URL(origin);
        const envIsLoopback = ['localhost', '127.0.0.1'].includes(env.hostname);
        if (envIsLoopback && env.hostname !== current.hostname) {
          return normalize(origin);
        }
      }
      return normalize(env.toString());
    } catch (err) {
      console.warn('⚠️ VITE_API_BASE_URL 无效，改用同源:', envUrl, err);
    }
  }

  // 2) 默认同源，确保 EXE/生产环境不跑到客户端本机
  if (origin) {
    return normalize(origin);
  }

  // 3) 兜底（主要用于单元测试环境）
  return 'http://localhost:8000';
};

/**
 * 创建 Axios 实例
 * 通过环境变量控制 baseURL
 */
const api: AxiosInstance = axios.create({
  baseURL: resolveBaseURL(),
  // 适度延长超时，避免网络抖动导致 axios 主动取消请求
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});


/**
 * 请求拦截器：自动附加 Token
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器：统一处理 HTTP 错误
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const { status } = error.response;
      switch (status) {
        case 401:
          console.warn('会话已过期，请重新登录');
          localStorage.removeItem('access_token');
          localStorage.removeItem('remember_user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;
        case 403:
          console.error('权限不足，无法访问该资源');
          break;
        case 404:
          console.error('请求的资源不存在');
          break;
        case 500:
          console.error('服务器内部错误，请稍后重试');
          break;
        case 503:
          console.error('服务暂时不可用，请稍后重试');
          break;
        default:
          console.error(`请求失败: ${status}`);
      }
    } else if (error.request) {
      console.error('网络错误，请检查您的网络连接');
    } else {
      console.error('请求配置错误:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * 导出 Axios 实例
 * 各业务模块可直接引入使用
 */
export default api;
