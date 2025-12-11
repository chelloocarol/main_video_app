/// frontend/src/pages/LoginPage.tsx

import { useUserStore } from '../store/userStore';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { theme } from '../styles/theme';
import { LoginForm } from '../components';


/**
 * 登录页面
 * - 调用后端 /token 登录接口
 * - 登录成功后跳转至 /video
 * - 背景有动态线条与圆点动画
 */
const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useUserStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');


  // ✅ 使用 useMemo 保证随机动画元素只生成一次（防止重复渲染闪烁）
  const lines = useMemo(
    () =>
      Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        delay: i * 0.1,
        duration: 3 + Math.random() * 2,
        angle: Math.random() * 360,
        top: Math.random() * 100,
        left: Math.random() * 100,
      })),
    []
  );

  const dots = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        delay: i * 0.2,
        size: 2 + Math.random() * 4,
        x: Math.random() * 100,
        y: Math.random() * 100,
      })),
    []
  );

  // 登录处理
  const handleLogin = async (username: string, password: string, remember: boolean) => {
    try {
      setLoading(true);
      setError('');
      await login(username, password, remember);

      navigate('/video', { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <BackgroundDecoration>
        <GeometricLines>
          {lines.map(line => (
            <Line
              key={line.id}
              $delay={line.delay}
              $duration={line.duration}
              $angle={line.angle}
              $top={line.top}
              $left={line.left}
            />
          ))}
        </GeometricLines>

        <FloatingDots>
          {dots.map(dot => (
            <Dot
              key={dot.id}
              $delay={dot.delay}
              $size={dot.size}
              $x={dot.x}
              $y={dot.y}
            />
          ))}
        </FloatingDots>

        <Glow $position="top-left" />
        <Glow $position="bottom-right" />
      </BackgroundDecoration>

      <LoginContainer>
        <LogoSection>
          <LogoIcon>
            <img src="/logo.png" alt="Logo" width="60" height="auto" />
          </LogoIcon>
          <SystemTitle>视频在线智能监测处理系统</SystemTitle>
          <SystemSubtitle>Mine Video Enhancement Platform</SystemSubtitle>
        </LogoSection>

        <FormWrapper>
          <LoginForm onSubmit={handleLogin} loading={loading} />
        </FormWrapper>

        {error && (
          <ErrorAlert>
            <ErrorIcon>⚠️</ErrorIcon>
            <ErrorText>{error}</ErrorText>
          </ErrorAlert>
        )}

        <Footer>
          <FooterText>视频在线智能监测处理系统</FooterText>
          <FooterText>© 2025 All Rights Reserved</FooterText>
        </Footer>
      </LoginContainer>

      <VersionInfo>v1.0.0</VersionInfo>
    </PageContainer>
  );
};

// ============================================================================
// 样式定义
// ============================================================================

const PageContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  width: 100%;
  background: ${theme.colors.primary.gradient};
  overflow: hidden;
`;

const BackgroundDecoration = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
`;

const GeometricLines = styled.div`
  position: absolute;
  inset: 0;
`;

const Line = styled.div<{
  $delay: number;
  $duration: number;
  $angle: number;
  $top: number;
  $left: number;
}>`
  position: absolute;
  width: 200px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(22, 119, 255, 0.3),
    transparent
  );
  top: ${props => props.$top}%;
  left: ${props => props.$left}%;
  transform: rotate(${props => props.$angle}deg);
  opacity: 0;
  animation: lineMove ${props => props.$duration}s linear ${props => props.$delay}s infinite;

  @keyframes lineMove {
    0% {
      opacity: 0;
      transform: translateX(-100px) rotate(${props => props.$angle}deg);
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translateX(100px) rotate(${props => props.$angle}deg);
    }
  }
`;

const FloatingDots = styled.div`
  position: absolute;
  inset: 0;
`;

const Dot = styled.div<{ $delay: number; $size: number; $x: number; $y: number }>`
  position: absolute;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  background: rgba(22, 119, 255, 0.6);
  border-radius: 50%;
  left: ${props => props.$x}%;
  top: ${props => props.$y}%;
  animation: float 4s ease-in-out ${props => props.$delay}s infinite;
  box-shadow: 0 0 10px rgba(22, 119, 255, 0.5);

  @keyframes float {
    0%, 100% {
      transform: translateY(0) scale(1);
      opacity: 0.6;
    }
    50% {
      transform: translateY(-20px) scale(1.2);
      opacity: 1;
    }
  }
`;

const Glow = styled.div<{ $position: 'top-left' | 'bottom-right' }>`
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(22, 119, 255, 0.15),
    transparent 70%
  );
  filter: blur(60px);
  ${({ $position }) =>
    $position === 'top-left'
      ? `top: -250px; left: -250px;`
      : `bottom: -250px; right: -250px;`}
`;

const LoginContainer = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 450px;
  padding: ${theme.spacing.xxl};
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: ${theme.borderRadius.large};
  box-shadow: ${theme.shadows.large};
  animation: slideIn 0.6s ease-out;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: ${theme.breakpoints.mobile}) {
    max-width: 90%;
    padding: ${theme.spacing.lg};
  }
`;

const LogoSection = styled.div`
  text-align: center;
  margin-bottom: ${theme.spacing.xl};
`;

const LogoIcon = styled.div`
  font-size: 64px;
  margin-bottom: ${theme.spacing.md};
  animation: logoFloat 3s ease-in-out infinite;

  @keyframes logoFloat {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }
`;

const SystemTitle = styled.h1`
  font-size: 24px;
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.primary.main};
  margin: 0 0 ${theme.spacing.sm} 0;
  letter-spacing: 1px;
`;

const SystemSubtitle = styled.p`
  font-size: 13px;
  color: ${theme.colors.text.placeholder};
  margin: 0;
`;

const FormWrapper = styled.div`
  margin-bottom: ${theme.spacing.lg};
`;

const ErrorAlert = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  background: rgba(255, 77, 79, 0.1);
  border: 1px solid ${theme.colors.status.error};
  border-radius: ${theme.borderRadius.medium};
  margin-bottom: ${theme.spacing.lg};
`;

const ErrorIcon = styled.span`
  font-size: 20px;
`;

const ErrorText = styled.span`
  flex: 1;
  color: ${theme.colors.status.error};
`;

const Footer = styled.div`
  text-align: center;
  padding-top: ${theme.spacing.lg};
  border-top: 1px solid rgba(0, 0, 0, 0.1);
`;

const FooterText = styled.p`
  font-size: 12px;
  color: ${theme.colors.text.placeholder};
  margin: ${theme.spacing.xs} 0;
`;

const VersionInfo = styled.div`
  position: fixed;
  bottom: ${theme.spacing.md};
  right: ${theme.spacing.md};
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
`;

export default LoginPage;
