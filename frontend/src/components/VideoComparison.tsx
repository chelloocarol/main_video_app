// frontend/src/components/VideoComparison.tsx - 视频对比面板组件（优化版）

import React from 'react';
import styled from 'styled-components';
import { theme } from '../styles/theme';
import VideoPlayer from './VideoPlayer';

interface VideoComparisonProps {
  cameraId: string;
  cameraName: string;
  originalStreamUrl: string;
  enhancedStreamUrl: string;
}

/**
 * 视频对比面板组件
 * 左右对比展示原始和增强视频流
 *
 * 优化点：
 * 1. 使用 16:9 宽高比容器，更适合横向视频
 * 2. 响应式布局，自动适配不同屏幕尺寸
 * 3. 保持视频原始比例，避免拉伸变形
 */
const VideoComparison: React.FC<VideoComparisonProps> = ({
  cameraId,
  cameraName,
  originalStreamUrl,
  enhancedStreamUrl,
}) => {
  return (
    <ComparisonGrid>
      <VideoPlayer
        key={`${cameraId}-orig`}
        streamUrl={
            originalStreamUrl.startsWith('rtsp://')
               ? enhancedStreamUrl
               : originalStreamUrl
        }
        title={cameraName}
        type="original"
      />

      <Divider>
        <DividerLine />
        <DividerIcon>⚡</DividerIcon>
        <DividerLine />
      </Divider>

      <VideoPlayer
        key={`${cameraId}-enh`}
        streamUrl={enhancedStreamUrl}
        title={cameraName}
        type="enhanced"
      />
    </ComparisonGrid>
  );
};

// ============================================================================
// 样式定义（优化版）
// ============================================================================

// 🔧 对比网格布局容器
const ComparisonGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: ${theme.spacing.md};  // 视频之间的间距
  height: 100%;
  width: 100%;
  min-height: 0; /* 🔧 关键：允许内容收缩 */
  /* 🔧 优化：确保视频容器占满高度 */
  align-items: stretch;


  /* 🔧 修复：防止子元素重叠 */
  > * {
    min-width: 0; /* 防止内容撑开容器 */
    min-height: 0; /* 防止内容撑开容器 */
  }

  /* 平板和小屏幕：改为垂直布局 */
  @media (max-width: ${theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto 1fr;
  }

  /* 超小屏幕：进一步优化间距 */
  @media (max-width: ${theme.breakpoints.mobile}) {
    gap: ${theme.spacing.sm};
  }
`;
// 🔧 分隔区域容器
const Divider = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.md};  // 🔧 改为 sm
  padding: 0;
  min-width: 60px;  // 最小宽度（从 60px 改为 40px）
   /* 🔧 平板布局：改为水平方向 */
  @media (max-width: ${theme.breakpoints.tablet}) {
    flex-direction: row;
    padding: ${theme.spacing.sm} 0;
    min-width: auto;
    min-height: 60px;
  }
`;

const DividerLine = styled.div`
  flex: 1;
  width: 2px;
  background: linear-gradient(
    to bottom,
    transparent,
    ${theme.colors.secondary.blue},
    transparent
  );
  min-height: 40px; /* 🔧 确保线条可见 */

  @media (max-width: ${theme.breakpoints.tablet}) {
    width: auto;
    height: 2px;
    min-height: auto;
    min-width: 40px;
    background: linear-gradient(
      to right,
      transparent,
      ${theme.colors.secondary.blue},
      transparent
    );
  }
`;

const DividerIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 20px;
  background: ${theme.colors.secondary.blue};
  border-radius: 50%;
  color: ${theme.colors.text.title};
  box-shadow: 0 0 20px rgba(22, 119, 255, 0.5);
  animation: glow 2s ease-in-out infinite;
  flex-shrink: 0; /* 🔧 防止图标被压缩 */

  @keyframes glow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(22, 119, 255, 0.5);
    }
    50% {
      box-shadow: 0 0 30px rgba(22, 119, 255, 0.8);
    }
  }
`;

export default VideoComparison;