// frontend/src/pages/VideoPage.tsx - 视频展示页面（完全修复版）

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from '../styles/theme';
import { Navbar, Sidebar, VideoComparison, Loading, Button } from '../components';
import {
  getVideoStreamUrl,
  getEnhancementStatus,
  type VideoStreamUrl,
} from '../services/video';

import { useUserStore } from '../store/userStore';
import { getCameraList } from '../services/camera';
import { resetSettings } from '../services/settings';

interface Camera {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
}

/**
 * 视频监控页面
 *
 * 修复问题：
 * 1. ✅ 修复 currentCamera 重复声明
 * 2. ✅ 修复视频重叠问题
 * 3. ✅ 优化 16:9 视频显示
 */
const VideoPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user) || { username: 'admin', role: 'admin' };
  // 🔧 新增：从 store 获取 logout 方法
  const logout = useUserStore((state) => state.logout);

  // ============================================================================
  // 状态管理
  // ============================================================================
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('camera-1');
  const [streamUrls, setStreamUrls] = useState<VideoStreamUrl | null>(null);

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState('');

  // ============================================================================
  // 生命周期 - 初始化
  // ============================================================================
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }
    initializePage();
  }, [navigate]);

  // ============================================================================
  // 数据加载函数
  // ============================================================================
  const initializePage = async () => {
    try {
      setIsLoading(true);

      // 加载摄像头列表
      const camList = await getCameraList();

      const formattedCameras = camList.map((c: any) => ({
        id: c.camera_id,
        name: c.name,
        location: c.location,
        status: c.status,
      }));
      setCameras(formattedCameras);

      // 加载默认摄像头视频流
      if (formattedCameras.length > 0) {
        const defaultCameraId = formattedCameras[0].id;
        setSelectedCameraId(defaultCameraId);
        await loadVideoStream(defaultCameraId);
        await checkEnhancementStatus(defaultCameraId);
      }
    } catch (err) {
      console.error('初始化失败:', err);
      setError('初始化失败，请刷新页面重试');
    } finally {
      setIsLoading(false);
    }
  };

  const loadVideoStream = useCallback(async (cameraId: string) => {
    try {
      console.log('🎥 加载视频流:', cameraId);
      const result = await getVideoStreamUrl(cameraId);

      if (result.success) {
        setStreamUrls(result.data);
        setError('');
        console.log('✅ 视频流加载成功:', result.data);
      } else {
        setError(result.message || '视频流加载失败');
        console.error('❌ 视频流加载失败:', result.message);
      }
    } catch (err: any) {
      console.error('❌ 加载视频流异常:', err);
      setError('无法连接到视频服务');
    }
  }, []);

  const checkEnhancementStatus = useCallback(async (cameraId: string) => {
    try {
      const result = await getEnhancementStatus(cameraId);
      if (result.success) {
        setIsEnhancing(result.data.is_running);
      }
    } catch (err) {
      console.warn('⚠️ 增强状态检查失败:', err);
    }
  }, []);

  // ============================================================================
  // 事件处理函数
  // ============================================================================
  const handleCameraSelect = useCallback(async (cameraId: string) => {
    console.log('📷 切换摄像头:', cameraId);
    setSelectedCameraId(cameraId);
    await loadVideoStream(cameraId);
    await checkEnhancementStatus(cameraId);
  }, [loadVideoStream, checkEnhancementStatus]);


  // ============================================================================
  // 渲染
  // ============================================================================
  if (isLoading) return <Loading fullscreen text="正在加载系统..." />;

  const currentCamera = cameras.find((c) => c.id === selectedCameraId);

   return (
    <PageContainer>
      <Navbar username={user.username} userRole={user.role} onLogout={logout} />
      <MainLayout>
        <Sidebar
          cameras={cameras}
          selectedCameraId={selectedCameraId}
          onCameraSelect={handleCameraSelect}
        />

        <ContentArea>
          {/* 🎥 视频显示区域 */}
          <VideoSection>
            {streamUrls ? (
              <VideoComparison
                cameraId={selectedCameraId}
                cameraName={currentCamera?.name || '未知摄像头'}
                originalStreamUrl={streamUrls.original_stream_url}
                enhancedStreamUrl={streamUrls.enhanced_stream_url}
              />
            ) : (
              <EmptyState>
                <EmptyIcon>📹</EmptyIcon>
                <EmptyText>暂无视频流</EmptyText>
                <EmptyHint>请选择摄像头或检查网络连接</EmptyHint>
              </EmptyState>
            )}
          </VideoSection>
            {/* 状态信息 */}
            <StatusInfo>
              <StatusItem>
                <StatusLabel>当前摄像头：</StatusLabel>
                <StatusValue>{currentCamera?.name || '未选择'}</StatusValue>
              </StatusItem>
              <StatusItem>
                <StatusLabel>增强状态：</StatusLabel>
                <StatusValue $status={isEnhancing}>
                  {isEnhancing ? '🟢 运行中' : '⚪ 已停止'}
                </StatusValue>
              </StatusItem>
            </StatusInfo>
        </ContentArea>
      </MainLayout>
    </PageContainer>
  );
};

// ============================================================================
// 样式定义
// ============================================================================

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: ${theme.colors.primary.gradient};
  overflow: hidden;
`;

const MainLayout = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: ${theme.spacing.lg};
  gap: ${theme.spacing.md};
  overflow-y: auto;
  min-width: 0;
  padding-bottom: 80px;

  /* 自定义滚动条 */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(22, 119, 255, 0.5);
    border-radius: 3px;
  }

  @media (max-width: ${theme.breakpoints.tablet}) {
    padding: ${theme.spacing.md};
  }
`;

const VideoSection = styled.div`
  flex: 1; // * ✅ 允许自动伸缩，不固定死高度 */
  display: flex;
  min-height: 600px;  // 🔧 设置最小高度
  max-height: 90vh;  // 🔧 设置最大高度
  overflow: hidden;

  @media (max-width: ${theme.breakpoints.tablet}) {
    min-height: 300px;
    max-height: 50vh;
  }
`;

const ErrorAlert = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  margin-top: ${theme.spacing.md};
  background: rgba(255, 77, 79, 0.1);
  border: 1px solid ${theme.colors.status.error};
  border-radius: ${theme.borderRadius.medium};
`;

const ErrorIcon = styled.span`
  font-size: 20px;
`;

const ErrorText = styled.span`
  color: ${theme.colors.status.error};
`;

const StatusInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.lg};
  padding: ${theme.spacing.md};
 background: rgba(0, 0, 0, 0.2);
  border-radius: ${theme.borderRadius.medium};
`;

const StatusItem = styled.div`
  display: flex;
  justify-content: space-between;
`;

const StatusLabel = styled.span`
  color: ${theme.colors.text.body};
`;

const StatusValue = styled.span<{ $status?: boolean }>`
  color: ${props => props.$status ? theme.colors.status.success : theme.colors.text.body};
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};
`;

const EmptyIcon = styled.div`
  font-size: 64px;
  opacity: 0.5;
`;

const EmptyText = styled.div`
  font-size: ${theme.typography.fontSize.title};
  color: ${theme.colors.text.title};
`;

const EmptyHint = styled.div`
  font-size: ${theme.typography.fontSize.body};
  color: ${theme.colors.text.body};
  opacity: 0.8;
`;


export default VideoPage;