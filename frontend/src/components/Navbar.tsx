// --- 保持 import 不变 ---
import { useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../styles/theme';
import Button from './Button';

interface NavbarProps {
  username: string;
  userRole?: string;
  onLogout: () => void;
}

/**
 * 顶部导航栏组件
 */
const Navbar: React.FC<NavbarProps> = ({
  username,
  userRole = 'user',
  onLogout,
}) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // 🔧 修复：处理退出登录
  const handleLogout = async () => {
    try {
      console.log('🚪 Navbar: 触发退出登录');

      // 1. 关闭菜单
      setShowUserMenu(false);

      // 2. 调用父组件传入的 logout 方法
      await onLogout();

      // 3. 跳转到登录页（确保执行）
      console.log('🚪 Navbar: 跳转到登录页');
      navigate('/login', { replace: true });

    } catch (error) {
      console.error('❌ Navbar: 退出登录失败', error);

      // 即使出错也强制跳转
      navigate('/login', { replace: true });
    }
  };

  return (
    <Container>
      {/* 左侧 Logo + 标题 */}
      <LeftSection>
        <Logo>
          <img src="/logo.png" alt="Logo" width="40" height="auto" />
        </Logo>
        <SystemInfo>
          <SystemName>视频在线智能监测处理系统</SystemName>
          <SystemSubtitle>Mine Video Enhancement System</SystemSubtitle>
        </SystemInfo>
      </LeftSection>

      {/* 右侧系统设置 + 用户信息 */}
      <RightSection>

        {/* 系统设置按钮 —— 单独一个按钮，不放中间导航栏了 */}
        <SettingsButton onClick={() => navigate('/settings')}>
              <SettingsIcon>ℹ️</SettingsIcon>
              <SettingsText>系统信息</SettingsText>
        </SettingsButton>

        {/* 用户信息区域 */}
        <UserSection
          onMouseEnter={() => setShowUserMenu(true)}
          onMouseLeave={() => setShowUserMenu(false)}
        >
          <Avatar><AvatarIcon>👤</AvatarIcon></Avatar>

          <UserInfo>
            <UserName>{username}</UserName>
            <UserRole>{userRole === 'admin' ? '管理员' : '操作员'}</UserRole>
          </UserInfo>

          {showUserMenu && (
            <UserMenu>
              <MenuItem onClick={onLogout}>
                <MenuIcon>🚪</MenuIcon>
                <span>退出登录</span>
              </MenuItem>
            </UserMenu>
          )}
        </UserSection>

      </RightSection>
    </Container>
  );
};

// =================== 样式 ====================


const SettingsText = styled.span`
  font-size: 14px;
  white-space: nowrap;
`;

const Container = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${theme.spacing.xl};
  height: 64px;
  background: ${theme.colors.primary.gradient};
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: ${theme.shadows.medium};
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
`;

const Logo = styled.div`
  animation: float 3s ease-in-out infinite;

  @keyframes float {
    0%, 100% { transform: translateY(3px); }
    50% { transform: translateY(-2px); }
  }
`;

const SystemInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const SystemName = styled.h1`
  margin: 0;
  font-size: ${theme.typography.fontSize.title};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.title};
`;

const SystemSubtitle = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${theme.colors.text.body};
  opacity: 0.8;
`;

/* ----------------- Right ------------------- */

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.lg};
`;

/* 系统设置按钮（右上角） */
const SettingsButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.12);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(22, 119, 255, 0.25);
    border-color: ${theme.colors.secondary.blue};
    transform: translateY(-1px);
  }
`;

const SettingsIcon = styled.span`
  font-size: 16px;
`;

const UserSection = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border-radius: ${theme.borderRadius.medium};
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  background: ${theme.colors.secondary.blue};
  border-radius: 50%;
  border: 2px solid ${theme.colors.text.title};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AvatarIcon = styled.div`
  font-size: 20px;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const UserName = styled.div`
  font-size: ${theme.typography.fontSize.body};
  font-weight: bold;
  color: ${theme.colors.text.title};
`;

const UserRole = styled.div`
  font-size: 12px;
  color: ${theme.colors.text.body};
`;

const UserMenu = styled.div`
  position: absolute;
  top: 54px;
  right: 0;
  min-width: 160px;
  background: rgba(10, 31, 68, 0.98);
  backdrop-filter: blur(12px);
  border-radius: ${theme.borderRadius.medium};
  box-shadow: ${theme.shadows.large};
  overflow: hidden;
  z-index: 1000;
`;

const MenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  width: 100%;
  padding: ${theme.spacing.md};
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;

  &:hover {
    background: rgba(22, 119, 255, 0.25);
  }
`;

const MenuIcon = styled.span`
  font-size: 18px;
`;

export default Navbar;
