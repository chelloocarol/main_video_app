// frontend/src/components/Loading.tsx - 加载动画组件

import React from 'react';
import styled from 'styled-components';
import { theme } from '../styles/theme';

interface LoadingProps {
  fullscreen?: boolean;
  text?: string;
}

/**
 * 加载动画组件
 * 可用于全屏或局部加载状态
 */
const Loading: React.FC<LoadingProps> = ({
  fullscreen = false,
  text = '加载中...',
}) => {
  return (
    <Container $fullscreen={fullscreen}>
      <LoadingAnimation>
        <Circle $delay={0} />
        <Circle $delay={0.2} />
        <Circle $delay={0.4} />
      </LoadingAnimation>
      {text && <LoadingText>{text}</LoadingText>}
    </Container>
  );
};

// 样式定义
const Container = styled.div<{ $fullscreen: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.lg};

  ${props => props.$fullscreen && `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(10, 31, 68, 0.95);
    backdrop-filter: blur(10px);
    z-index: 9999;
  `}
`;

const LoadingAnimation = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

const Circle = styled.div<{ $delay: number }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${theme.colors.secondary.blue};
  animation: bounce 1.4s ease-in-out ${props => props.$delay}s infinite;

  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

const LoadingText = styled.div`
  font-size: ${theme.typography.fontSize.body};
  color: ${theme.colors.text.body};
  font-weight: ${theme.typography.fontWeight.normal};
`;

export default Loading;

