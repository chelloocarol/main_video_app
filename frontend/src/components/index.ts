// frontend/src/components/index.ts - 组件统一导出文件

/**
 * 组件库统一导出
 * 方便其他模块导入使用
 */

// 基础组件
export { default as Button } from './Button';
export { default as Input } from './Input';
export { default as Loading } from './Loading';

// 表单组件
export { default as LoginForm } from './LoginForm';

// 导航组件
export { default as Navbar } from './Navbar';
export { default as Sidebar } from './Sidebar';

// 视频相关组件
export { default as VideoPlayer } from './VideoPlayer';
export { default as VideoComparison } from './VideoComparison';

// 类型导出（如果需要）
export type { default as ButtonProps } from './Button';
export type { default as InputProps } from './Input';