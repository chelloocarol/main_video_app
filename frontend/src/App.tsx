// frontend/src/App.tsx - 应用主入口文件
import React, { Suspense, lazy, useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  Outlet,
} from 'react-router-dom';
import { GlobalStyles } from './styles/GlobalStyles';
import { Loading } from './components';
import { useUserStore } from './store';

// 懒加载页面组件
const LoginPage = lazy(() => import('./pages/LoginPage'));
const VideoPage = lazy(() => import('./pages/VideoPage'));
const SettingPage = lazy(() => import('./pages/SettingPage'));

/**
 * 受保护路由组件
 * 未登录用户将被重定向到登录页
 */
const ProtectedRoute: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const token = useUserStore((state) => state.token);

  // 🔧 修复：使用 useEffect，但只在状态变化时检查一次
  useEffect(() => {
    if (!isLoggedIn || !token) {
      navigate('/login', { replace: true });
    }
  }, [isLoggedIn, token]); // 👈 移除 navigate 依赖

  // 如果未登录，显示加载中（导航在 useEffect 中处理）
  if (!isLoggedIn || !token) {
    return <Loading fullscreen text="验证登录状态..." />;
  }

  return (
    <Suspense fallback={<Loading fullscreen text="加载页面中..." />}>
      <Outlet />
    </Suspense>
  );
};

/**
 * 公共路由组件
 * 已登录用户访问登录页将被重定向到视频页
 */
const PublicRoute: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const token = useUserStore((state) => state.token);

  // 🔧 修复：使用 useEffect，但只在状态变化时检查一次
  useEffect(() => {
    if (isLoggedIn && token) {
      navigate('/video', { replace: true });
    }
  }, [isLoggedIn, token]); // 👈 移除 navigate 依赖

  // 如果已登录，显示加载中（导航在 useEffect 中处理）
  if (isLoggedIn && token) {
    return <Loading fullscreen text="跳转中..." />;
  }

  return (
    <Suspense fallback={<Loading fullscreen text="加载中..." />}>
      <Outlet />
    </Suspense>
  );
};

/**
 * 应用初始化组件
 */
const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const isLoading = useUserStore((state) => state.isLoading);

  useEffect(() => {
    // 🔧 修复：直接调用 store 的 initialize 方法，避免依赖函数引用
    const initApp = async () => {
      try {
        await useUserStore.getState().initialize();
      } catch (error) {
        console.error('应用初始化失败:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initApp();
  }, []); // 👈 空依赖数组，只执行一次

  // 初始化中显示加载动画
  if (!isInitialized || isLoading) {
    return <Loading fullscreen text="初始化应用中..." />;
  }

  return <>{children}</>;
};

/**
 * App 主组件
 */
const App: React.FC = () => {
  return (
    <>
      {/* 全局样式 */}
      <GlobalStyles />

      <BrowserRouter>
        <AppInitializer>
          <Routes>
            {/* 公共路由 - 登录页 */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            {/* 受保护路由 - 需要登录 */}
            <Route element={<ProtectedRoute />}>
              <Route path="/video" element={<VideoPage />} />
              <Route path="/settings" element={<SettingPage />} />   // ← 新增
            </Route>

            {/* 根路径重定向 */}
            <Route
              path="/"
              element={
                <Navigate
                  to={
                    useUserStore.getState().isLoggedIn
                      ? '/video'
                      : '/login'
                  }
                  replace
                />
              }
            />

            {/* 404 页面 */}
            <Route
              path="*"
              element={
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    background: 'linear-gradient(135deg, #0A1F44 0%, #1F4B99 100%)',
                  }}
                >
                  <div style={{ textAlign: 'center', color: 'white' }}>
                    <h1 style={{ fontSize: '72px', margin: '0 0 16px 0' }}>404</h1>
                    <p style={{ fontSize: '20px', margin: '0 0 32px 0' }}>
                      页面未找到
                    </p>

                    <a
                      href="/"
                      style={{
                        display: 'inline-block',
                        padding: '12px 24px',
                        background: '#1677FF',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '6px',
                        fontSize: '16px',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#409EFF';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = '#1677FF';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      返回首页
                    </a>
                  </div>
                </div>
              }
            />
          </Routes>
        </AppInitializer>
      </BrowserRouter>
    </>
  );
};

export default App;