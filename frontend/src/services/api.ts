// frontend/src/services/api.ts
// Axios 实例配置文件 —— 不导入其他 service，避免循环依赖

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * 创建 Axios 实例
 * 通过环境变量控制 baseURL
 */
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 10000,
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
