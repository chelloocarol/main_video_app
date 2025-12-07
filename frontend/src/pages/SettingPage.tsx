// frontend/src/pages/SettingPage.tsx - 系统信息页面（只读）

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from '../styles/theme';
import { Navbar, Loading } from '../components';
import { useUserStore } from '../store/userStore';
import { getCameraList } from '../services/camera';

/**
 * 系统信息页面（只读展示）
 */
const SettingPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user) || {
    username: 'admin',
    role: 'admin'
  };
  const logout = useUserStore((state) => state.logout);

  const [isLoading, setIsLoading] = useState(true);
  const [systemInfo, setSystemInfo] = useState({
    totalCameras: 0,
    onlineCameras: 0,
    version: 'v1.0.0',
    backendUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  });

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadSystemInfo();
  }, [navigate]);

  const loadSystemInfo = async () => {
    try {
      setIsLoading(true);
      const cameras = await getCameraList();

      setSystemInfo({
        totalCameras: cameras.length,
        onlineCameras: cameras.filter(c => c.status === 'online').length,
        version: 'v1.0.0',
        backendUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
      });
    } catch (err) {
      console.error('加载系统信息失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loading fullscreen text="加载系统信息中..." />;
  }

  return (
    <PageContainer>
      <Navbar
        username={user.username}
        userRole={user.role}
        onLogout={logout}
      />

      <MainContent>
        <ContentWrapper>
          <PageHeader>
            <BackButton onClick={() => navigate('/video')}>
              ← 返回
            </BackButton>
            <HeaderTitle>ℹ️ 系统信息</HeaderTitle>
            <HeaderSubtitle>查看系统运行状态和配置信息</HeaderSubtitle>
          </PageHeader>

          {/* 系统版本信息 */}
          <InfoSection>
            <SectionTitle>📦 版本信息</SectionTitle>
            <InfoGrid>
              <InfoItem>
                <InfoLabel>系统版本：</InfoLabel>
                <InfoValue>{systemInfo.version}</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>后端地址：</InfoLabel>
                <InfoValue>{systemInfo.backendUrl}</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>当前用户：</InfoLabel>
                <InfoValue>{user.username} ({user.role === 'admin' ? '管理员' : '操作员'})</InfoValue>
              </InfoItem>
            </InfoGrid>
          </InfoSection>

          {/* 摄像头统计 */}
          <InfoSection>
            <SectionTitle>📹 摄像头统计</SectionTitle>
            <InfoGrid>
              <InfoItem>
                <InfoLabel>总数：</InfoLabel>
                <InfoValue>{systemInfo.totalCameras} 个</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>在线：</InfoLabel>
                <InfoValue $status="online">
                  {systemInfo.onlineCameras} 个
                </InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>离线：</InfoLabel>
                <InfoValue $status="offline">
                  {systemInfo.totalCameras - systemInfo.onlineCameras} 个
                </InfoValue>
              </InfoItem>
            </InfoGrid>
          </InfoSection>

          {/* 功能说明 */}
          <InfoSection>
            <SectionTitle>💡 功能说明</SectionTitle>
            <FeatureList>
              <FeatureItem>
                <FeatureIcon>✅</FeatureIcon>
                <FeatureText>智能在线实时视频增强处理</FeatureText>
              </FeatureItem>
              <FeatureItem>
                <FeatureIcon>✅</FeatureIcon>
                <FeatureText>原始视频与增强视频对比显示</FeatureText>
              </FeatureItem>
              <FeatureItem>
                <FeatureIcon>✅</FeatureIcon>
                <FeatureText>多摄像头切换与管理</FeatureText>
              </FeatureItem>
              <FeatureItem>
                <FeatureIcon>✅</FeatureIcon>
                <FeatureText>用户认证与权限管理</FeatureText>
              </FeatureItem>
            </FeatureList>
          </InfoSection>

          {/* 技术栈 */}
          <InfoSection>
            <SectionTitle>🛠 技术栈</SectionTitle>
            <TechStack>
              <TechItem>
                <TechLabel>视频协议：</TechLabel>
                <TechValue>RTSP / MJPEG</TechValue>
              </TechItem>
            </TechStack>
          </InfoSection>

        </ContentWrapper>
      </MainContent>
    </PageContainer>
  );
};

// ============================================================================
// 样式定义
// ============================================================================

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: ${theme.colors.primary.gradient};
`;

const MainContent = styled.main`
  flex: 1;
  padding: ${theme.spacing.xl};
  overflow-y: auto;

  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: ${theme.spacing.md};
  }
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled.header`
  text-align: center;
  margin-bottom: ${theme.spacing.xxl};
  position: relative;
`;

const BackButton = styled.button`
  position: absolute;
  left: 0;
  top: 0;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: ${theme.borderRadius.medium};
  color: ${theme.colors.text.title};
  font-size: ${theme.typography.fontSize.body};
  cursor: pointer;
  transition: ${theme.transitions.fast};

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateX(-4px);
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    position: static;
    margin-bottom: ${theme.spacing.md};
  }
`;

const HeaderTitle = styled.h1`
  font-size: 32px;
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.title};
  margin: 0 0 ${theme.spacing.sm} 0;

  @media (max-width: ${theme.breakpoints.mobile}) {
    font-size: 24px;
  }
`;

const HeaderSubtitle = styled.p`
  font-size: ${theme.typography.fontSize.body};
  color: ${theme.colors.text.body};
  margin: 0;
`;

const InfoSection = styled.div`
  padding: ${theme.spacing.xl};
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.large};
  box-shadow: ${theme.shadows.card};
  margin-bottom: ${theme.spacing.lg};
`;

const SectionTitle = styled.h2`
  font-size: ${theme.typography.fontSize.title};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.primary.main};
  margin: 0 0 ${theme.spacing.lg} 0;
  padding-bottom: ${theme.spacing.sm};
  border-bottom: 2px solid ${theme.colors.secondary.blue};
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${theme.spacing.lg};
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const InfoLabel = styled.span`
  font-size: ${theme.typography.fontSize.body};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.input};
`;

const InfoValue = styled.span<{ $status?: 'online' | 'offline' }>`
  font-size: ${theme.typography.fontSize.body};
  color: ${props =>
    props.$status === 'online' ? theme.colors.status.success :
    props.$status === 'offline' ? theme.colors.status.error :
    theme.colors.secondary.blue
  };
  font-weight: ${theme.typography.fontWeight.bold};
`;

const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const FeatureItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background: rgba(22, 119, 255, 0.05);
  border-radius: ${theme.borderRadius.medium};
`;

const FeatureIcon = styled.span`
  font-size: 24px;
`;

const FeatureText = styled.span`
  font-size: ${theme.typography.fontSize.body};
  color: ${theme.colors.text.input};
`;

const TechStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
`;

const TechItem = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${theme.spacing.sm};
`;

const TechLabel = styled.span`
  font-size: ${theme.typography.fontSize.body};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.input};
  min-width: 80px;
`;

const TechValue = styled.span`
  font-size: ${theme.typography.fontSize.body};
  color: ${theme.colors.text.input};
`;

export default SettingPage;