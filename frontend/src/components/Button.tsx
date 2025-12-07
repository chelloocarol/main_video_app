// frontend/src/components/Button.tsx - 按钮组件

import React from 'react';
import styled from 'styled-components';
import { theme } from '../styles/theme';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  icon?: React.ReactNode;
}

/**
 * 按钮组件
 * 符合设计规范的按钮样式
 */
const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  icon,
}) => {
  return (
    <StyledButton
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
    >
      {loading && <Spinner />}
      {icon && <IconWrapper>{icon}</IconWrapper>}
      {children}
    </StyledButton>
  );
};

// 样式定义
const StyledButton = styled.button<{
  $variant: string;
  $size: string;
  $fullWidth: boolean;
}>`
  /* 基础样式 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  border: none;
  border-radius: ${theme.borderRadius.medium};
  font-family: ${theme.typography.fontFamily};
  font-size: ${theme.typography.fontSize.button};
  font-weight: ${theme.typography.fontWeight.bold};
  cursor: pointer;
  transition: ${theme.transitions.fast};
  white-space: nowrap;

  /* 宽度 */
  width: ${props => props.$fullWidth ? '100%' : 'auto'};

  /* 尺寸 */
  ${props => {
    switch (props.$size) {
      case 'small':
        return `
          padding: 6px 16px;
          height: 32px;
        `;
      case 'large':
        return `
          padding: 12px 24px;
          height: 48px;
        `;
      default: // medium
        return `
          padding: 9px 20px;
          height: 40px;
        `;
    }
  }}

  /* 主按钮样式 */
  ${props => props.$variant === 'primary' && `
    background: ${theme.colors.secondary.blue};
    color: ${theme.colors.secondary.white};

    &:hover:not(:disabled) {
      background: ${theme.colors.secondary.blueHover};
      transform: translateY(-1px);
      box-shadow: ${theme.shadows.small};
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }
  `}

  /* 次按钮样式 */
  ${props => props.$variant === 'secondary' && `
    background: ${theme.colors.secondary.white};
    color: ${theme.colors.secondary.blue};
    border: 1px solid ${theme.colors.secondary.blue};

    &:hover:not(:disabled) {
      background: ${theme.colors.secondary.blue};
      color: ${theme.colors.secondary.white};
      transform: translateY(-1px);
      box-shadow: ${theme.shadows.small};
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }
  `}

  /* 文字按钮样式 */
  ${props => props.$variant === 'text' && `
    background: transparent;
    color: ${theme.colors.secondary.blue};

    &:hover:not(:disabled) {
      background: rgba(22, 119, 255, 0.1);
    }
  `}

  /* 禁用状态 */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: ${theme.colors.secondary.white};
  border-radius: 50%;
  animation: spin 0.6s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  font-size: 16px;
`;

export default Button;