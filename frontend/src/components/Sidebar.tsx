// frontend/src/components/Sidebar.tsx - 侧边导航栏组件

import React from 'react';
import styled from 'styled-components';
import { theme } from '../styles/theme';

interface Camera {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
}

interface SidebarProps {
  cameras: Camera[];
  selectedCameraId?: string;
  onCameraSelect: (cameraId: string) => void;
}

/**
 * 侧边导航栏组件
 * 显示摄像头列表，支持选择切换
 */
const Sidebar: React.FC<SidebarProps> = ({
  cameras,
  selectedCameraId,
  onCameraSelect,
}) => {
  return (
    <Container>
      <Header>
        <HeaderIcon>📹</HeaderIcon>
        <HeaderTitle>视频通道</HeaderTitle>
      </Header>

      <CameraList>
        {cameras.map((camera) => (
          <CameraItem
            key={camera.id}
            $active={camera.id === selectedCameraId}
            $online={camera.status === 'online'}
            onClick={() => onCameraSelect(camera.id)}
          >
            <CameraIcon>
              {camera.status === 'online' ? '📹' : '📴'}
            </CameraIcon>

            <CameraInfo>
              <CameraName>{camera.name}</CameraName>
              <CameraLocation>{camera.location}</CameraLocation>
            </CameraInfo>

            <StatusBadge $online={camera.status === 'online'}>
              {camera.status === 'online' ? '在线' : '离线'}
            </StatusBadge>
          </CameraItem>
        ))}
      </CameraList>

      {cameras.length === 0 && (
        <EmptyState>
          <EmptyIcon>📭</EmptyIcon>
          <EmptyText>暂无视频通道</EmptyText>
        </EmptyState>
      )}
    </Container>
  );
};

// 样式定义
const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(10, 31, 68, 0.95);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: rgba(22, 119, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const HeaderIcon = styled.div`
  font-size: 24px;
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: ${theme.typography.fontSize.title};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.title};
`;

const CameraList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing.md};

  /* 自定义滚动条 */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(22, 119, 255, 0.5);
    border-radius: 3px;

    &:hover {
      background: rgba(22, 119, 255, 0.7);
    }
  }
`;

const CameraItem = styled.div<{ $active: boolean; $online: boolean }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.sm};
  background: ${props =>
    props.$active
      ? 'rgba(22, 119, 255, 0.2)'
      : 'rgba(255, 255, 255, 0.05)'
  };
  border: 1px solid ${props =>
    props.$active
      ? theme.colors.secondary.blue
      : 'transparent'
  };
  border-radius: ${theme.borderRadius.medium};
  cursor: pointer;
  transition: ${theme.transitions.fast};
  opacity: ${props => props.$online ? 1 : 0.6};

  &:hover {
    background: ${props =>
      props.$active
        ? 'rgba(22, 119, 255, 0.25)'
        : 'rgba(22, 119, 255, 0.15)'
    };
    transform: translateX(4px);
  }
`;

const CameraIcon = styled.div`
  font-size: 24px;
`;

const CameraInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const CameraName = styled.div`
  font-size: ${theme.typography.fontSize.body};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.title};
`;

const CameraLocation = styled.div`
  font-size: 12px;
  color: ${theme.colors.text.body};
`;

const StatusBadge = styled.div<{ $online: boolean }>`
  padding: 2px 8px;
  font-size: 11px;
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.title};
  background: ${props =>
    props.$online
      ? theme.colors.status.success
      : theme.colors.status.error
  };
  border-radius: ${theme.borderRadius.small};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing.xxl};
  gap: ${theme.spacing.md};
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  opacity: 0.5;
`;

const EmptyText = styled.div`
  font-size: ${theme.typography.fontSize.body};
  color: ${theme.colors.text.body};
`;

export default Sidebar;