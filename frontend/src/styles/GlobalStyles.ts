// frontend/src/styles/GlobalStyles.ts - 全局样式

import { createGlobalStyle } from 'styled-components';
import { theme } from './theme';

/**
 * 全局样式
 * 包含重置样式和基础样式
 */
export const GlobalStyles = createGlobalStyle`
  /* 重置样式 */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body, #root {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  body {
    font-family: ${theme.typography.fontFamily};
    font-size: ${theme.typography.fontSize.body};
    color: ${theme.colors.text.body};
    background: ${theme.colors.primary.gradient};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* 滚动条样式 */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(22, 119, 255, 0.5);
    border-radius: 4px;

    &:hover {
      background: rgba(22, 119, 255, 0.7);
    }
  }

  /* 选中文本样式 */
  ::selection {
    background: rgba(22, 119, 255, 0.3);
    color: ${theme.colors.text.title};
  }

  /* 禁用文本选择（某些元素） */
  button, .no-select {
    user-select: none;
  }

  /* 链接样式 */
  a {
    color: ${theme.colors.secondary.blue};
    text-decoration: none;
    transition: ${theme.transitions.fast};

    &:hover {
      color: ${theme.colors.secondary.blueHover};
    }
  }

  /* 输入框禁用样式 */
  input:disabled,
  textarea:disabled,
  button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  /* 响应式图片 */
  img {
    max-width: 100%;
    height: auto;
  }

  /* 无障碍：焦点样式 */
  *:focus-visible {
    outline: 2px solid ${theme.colors.secondary.blue};
    outline-offset: 2px;
  }

  /* 科技感背景装饰 */
  body::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image:
      linear-gradient(rgba(22, 119, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(22, 119, 255, 0.03) 1px, transparent 1px);
    background-size: 50px 50px;
    pointer-events: none;
    z-index: 0;
  }

  /* 响应式断点 */
  @media (max-width: ${theme.breakpoints.mobile}) {
    body {
      font-size: 13px;
    }
  }

  /* 打印样式 */
  @media print {
    body {
      background: white;
      color: black;
    }
  }
`

export default GlobalStyles