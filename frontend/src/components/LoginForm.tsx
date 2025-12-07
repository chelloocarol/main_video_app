// frontend/src/components/LoginForm.tsx - 登录表单组件

import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../styles/theme';
import Button from './Button';
import Input from './Input';

interface LoginFormProps {
  onSubmit: (username: string, password: string, remember: boolean) => Promise<void>;
  loading?: boolean;
}

/**
 * 登录表单组件
 * 包含账号、密码输入和记住我选项
 */
const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, loading = false }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      newErrors.username = '请输入用户名';
    }

    if (!password.trim()) {
      newErrors.password = '请输入密码';
    } else if (password.length < 6) {
      newErrors.password = '密码至少6位';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await onSubmit(username, password, remember);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <FormContainer onSubmit={handleSubmit}>
      <FormHeader>
        <Logo>🔒</Logo>
        <Title>用户登录</Title>
      </FormHeader>

      <FormBody>
        {/* 🔧 使用自定义样式的 Input 容器 */}
        <InputWrapper>
          <Input
            type="text"
            label="账号"
            placeholder="请输入用户名"
            value={username}
            onChange={setUsername}
            error={errors.username}
            fullWidth
            prefix="👤"
          />
        </InputWrapper>

        <InputWrapper>
          <Input
            type="password"
            label="密码"
            placeholder="请输入密码"
            value={password}
            onChange={setPassword}
            error={errors.password}
            fullWidth
            prefix="🔑"
          />
        </InputWrapper>

        <RememberMe>
          <Checkbox
            type="checkbox"
            id="remember"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <CheckboxLabel htmlFor="remember">记住我</CheckboxLabel>
        </RememberMe>

        <Button
          type="submit"
          variant="primary"
          size="large"
          fullWidth
          loading={loading}
        >
          登录
        </Button>
      </FormBody>

    </FormContainer>
  );
};

// 样式定义
const FormContainer = styled.form`
  width: 100%;
  max-width: 400px;
  padding: ${theme.spacing.xl};
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: ${theme.borderRadius.large};
  box-shadow: ${theme.shadows.card};
`;

const FormHeader = styled.div`
  text-align: center;
  margin-bottom: ${theme.spacing.xl};
`;

const Logo = styled.div`
  font-size: 48px;
  margin-bottom: ${theme.spacing.md};
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.primary.main};
  margin: 0 0 ${theme.spacing.sm} 0;
`;

const Subtitle = styled.p`
  font-size: ${theme.typography.fontSize.body};
  color: ${theme.colors.text.placeholder};
  margin: 0;
`;

const FormBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.lg};
`;

// 🔧 新增：Input 包装器，用于覆盖输入框字体颜色
const InputWrapper = styled.div`
  /* 覆盖 Input 组件内部的输入框字体颜色 */
  input {
    color: #1a1a1a !important;  // ✅ 深色字体，确保清晰可见
    font-weight: 500;
  }

  /* 覆盖 placeholder 颜色 */
  input::placeholder {
    color: #999999 !important;  // ✅ 保持 placeholder 为灰色
  }

  /* 覆盖 label 颜色 */
  label {
    color: ${theme.colors.text.input} !important;  // ✅ 深色 label
    font-weight: 600;
  }
`;

const RememberMe = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};

  label {
    font-size: ${theme.typography.fontSize.body};
    color: ${theme.colors.text.input};
    cursor: pointer;
    user-select: none;
  }
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: ${theme.colors.secondary.blue};
`;

// 🔧 修改：记住我文字颜色加深
const CheckboxLabel = styled.label`
  font-size: ${theme.typography.fontSize.body};
  color: #1a1a1a;  // ✅ 深色字体
  cursor: pointer;
  user-select: none;
  font-weight: 500;
`;

const HintText = styled.p`
  font-size: 12px;
  color: ${theme.colors.text.placeholder};
  margin: 0;
`;
export default LoginForm;