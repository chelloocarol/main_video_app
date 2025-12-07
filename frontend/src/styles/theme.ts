// frontend/src/styles/theme.ts - 主题配置文件

/**
 * 设计规范主题配置
 * 深蓝色科技风主题
 */

export const theme = {
  // 色彩规范
  colors: {
    // 主色调 - 深蓝色渐变
    primary: {
      dark: '#0A1F44',
      main: '#1F4B99',
      gradient: 'linear-gradient(135deg, #0A1F44 0%, #1F4B99 100%)',
    },

    // 辅助色
    secondary: {
      blue: '#1677FF',      // 高亮蓝色（按钮/交互）
      blueHover: '#409EFF', // 按钮悬停色
      gray: '#D9D9D9',      // 浅灰色（输入框/分隔线）
      white: '#FFFFFF',     // 白色（文字/卡片背景）
    },

    // 文字颜色
    text: {
      title: '#FFFFFF',     // 标题
      body: '#E6E6E6',      // 正文
      input: '#333333',     // 输入框内文字
      placeholder: '#999999', // 占位符
    },

    // 状态颜色
    status: {
      success: '#52C41A',
      warning: '#FAAD14',
      error: '#FF4D4F',
      info: '#1890FF',
    },
  },

  // 字体规范
  typography: {
    fontFamily: "'Microsoft YaHei', 'Source Sans Pro', Arial, sans-serif",
    fontSize: {
      title: '18px',      // 标题
      body: '14px',       // 正文
      input: '14px',      // 输入框文字
      button: '14px',     // 按钮文字
    },
    fontWeight: {
      normal: 400,
      bold: 600,
    },
  },

  // 间距规范
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  // 圆角规范
  borderRadius: {
    small: '4px',
    medium: '6px',
    large: '8px',
    circle: '50%',
  },

  // 阴影规范
  shadows: {
    small: '0 2px 8px rgba(0, 0, 0, 0.1)',
    medium: '0 4px 12px rgba(0, 0, 0, 0.15)',
    large: '0 8px 24px rgba(0, 0, 0, 0.2)',
    card: '0 4px 16px rgba(0, 0, 0, 0.12)',
  },

  // 过渡动画
  transitions: {
    fast: 'all 0.2s ease',
    normal: 'all 0.3s ease',
    slow: 'all 0.4s ease',
  },

  // 断点（响应式）
  breakpoints: {
    mobile: '768px',
    tablet: '1024px',
    desktop: '1440px',
  },
};

export type Theme = typeof theme;