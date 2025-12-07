// frontend/src/components/VideoPlayer.tsx - 视频播放器组件（优化版）

import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../styles/theme';

interface VideoPlayerProps {
  streamUrl: string;
  title: string;
  type: 'original' | 'enhanced';
}

/**
 * 通用视频播放组件
 *
 * 优化点：
 * 1. 使用 16:9 宽高比容器，适配横向视频
 * 2. 自动检测视频实际尺寸并调整显示
 * 3. 支持加载中与错误状态提示
 * 4. 保持视频原始比例，避免变形
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({ streamUrl, title, type }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(16 / 9);
  const imgRef = useRef<HTMLImageElement>(null);

  // 监听图片加载，获取实际尺寸
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const handleLoad = () => {
      setIsLoading(false);
      setHasError(false);

      // 计算实际宽高比
      if (img.naturalWidth && img.naturalHeight) {
        const ratio = img.naturalWidth / img.naturalHeight;
        setVideoAspectRatio(ratio);
        console.log(`📐 视频尺寸检测: ${img.naturalWidth}x${img.naturalHeight}, 宽高比: ${ratio.toFixed(2)}`);
      }
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [streamUrl]);

  return (
    <PlayerContainer $aspectRatio={videoAspectRatio}>
      <TitleBar>
        <Dot $type={type} />
        <TitleText>
          {type === 'original' ? '原始视频' : '增强视频'}：{title}
        </TitleText>
        {isLoading && <LoadingIndicator>⏳ 加载中...</LoadingIndicator>}
      </TitleBar>

      <VideoWrapper>
        {hasError ? (
          <ErrorBox>
            <ErrorIcon>⚠️</ErrorIcon>
            <ErrorText>视频加载失败</ErrorText>
            <ErrorHint>请检查网络连接或摄像头状态</ErrorHint>
          </ErrorBox>
        ) : (
          <>
            {isLoading && (
              <LoadingOverlay>
                <Spinner />
                <LoadingText>正在连接视频流...</LoadingText>
              </LoadingOverlay>
            )}
            <VideoFrame
              ref={imgRef}
              src={streamUrl}
              alt={`${title}-${type}`}
              onError={() => setHasError(true)}
              loading="lazy"
              $isLoading={isLoading}
            />
          </>
        )}
      </VideoWrapper>
    </PlayerContainer>
  );
};

// ================= 样式定义（优化版） =================

const PlayerContainer = styled.div<{ $aspectRatio: number }>`
  display: flex;
  flex-direction: column;
  background: transparent;
  border-radius: ${theme.borderRadius.medium};
  border: 1px solid rgba(255, 255, 255, 0.05);  // 🔧 极淡的边框，微妙区分
  backdrop-filter: blur(10px);  // 🔧 添加毛玻璃效果
  overflow: hidden;
  height: 100%;
  width: 100%; /* 🔧 修复：确保容器占满宽度 */
  min-height: 0;
  min-width: 0; /* 🔧 修复：防止内容撑开容器 */
  position: relative; /* 🔧 修复：建立定位上下文 */

  /* 🔧 关键优化：设置最小和最大高度，避免过度拉伸 */
  min-height: 300px;

  /* 🔧 使用 aspect-ratio 属性（现代浏览器支持） */
  @supports (aspect-ratio: 16 / 9) {
    aspect-ratio: ${props => props.$aspectRatio};
  }
    // 🔧 添加格纹效果
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 50px 50px;
`;

const TitleBar = styled.div`
  display: flex;
  align-items: center;
  padding: ${theme.spacing.md} ${theme.spacing.md};
  background: rgba(22, 119, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0; /* 🔧 防止标题栏被压缩 */
  gap: ${theme.spacing.sm};
`;

const Dot = styled.span<{ $type: 'original' | 'enhanced' }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${(p) =>
    p.$type === 'original' ? theme.colors.status.info : theme.colors.status.success};
  flex-shrink: 0;

  /* 🔧 添加脉动动画 */
  animation: pulse 2s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const TitleText = styled.span`
  font-size: ${theme.typography.fontSize.body};
  color: ${theme.colors.text.title};
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const LoadingIndicator = styled.span`
  font-size: 12px;
  color: ${theme.colors.status.warning};
  margin-left: auto;
`;

const VideoWrapper = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);  // 视频区域黑色背景
  min-height: 0;
  overflow: hidden;
`;

const VideoFrame = styled.img<{ $isLoading: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: contain; /* 🔧 关键：保持原始比例，不裁剪 */
  background: transparent;// 🔧 改为透明，让格纹背景透出
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  opacity: ${props => props.$isLoading ? 0 : 1};
  transition: 0;
  /* 🔧 确保图片不会超出容器 */
  max-width: 100%;
  max-height: 100%;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  gap: ${theme.spacing.md};
  z-index: 10;
`;

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid rgba(22, 119, 255, 0.2);
  border-top-color: ${theme.colors.secondary.blue};
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.div`
  font-size: ${theme.typography.fontSize.body};
  color: ${theme.colors.text.body};
`;

const ErrorBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xl};
  gap: ${theme.spacing.md};
  color: ${theme.colors.status.error};
  text-align: center;
`;

const ErrorIcon = styled.div`
  font-size: 48px;
  opacity: 0.8;
`;

const ErrorText = styled.div`
  font-size: ${theme.typography.fontSize.title};
  font-weight: ${theme.typography.fontWeight.bold};
`;

const ErrorHint = styled.div`
  font-size: ${theme.typography.fontSize.body};
  color: ${theme.colors.text.body};
  opacity: 0.8;
`;

export default VideoPlayer;