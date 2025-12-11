// frontend/src/components/Input.tsx - 输入框组件

import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../styles/theme';

interface InputProps {
  type?: 'text' | 'password' | 'email' | 'number';
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * 输入框组件
 * 扁平化设计，符合设计规范
 */
const Input: React.FC<InputProps> = ({
  type = 'text',
  value,
  defaultValue,
  placeholder,
  label,
  error,
  disabled = false,
  fullWidth = false,
  prefix,
  suffix,
  onChange,
  onFocus,
  onBlur,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <InputWrapper $fullWidth={fullWidth}>
      {label && <Label>{label}</Label>}

      <InputContainer
        $isFocused={isFocused}
        $hasError={!!error}
        $disabled={disabled}
      >
        {prefix && <PrefixIcon>{prefix}</PrefixIcon>}

        <StyledInput
          type={inputType}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        {type === 'password' && (
          <PasswordToggle type="button" onClick={togglePasswordVisibility}>
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </PasswordToggle>
        )}

        {suffix && <SuffixIcon>{suffix}</SuffixIcon>}
      </InputContainer>

      {error && <ErrorMessage>{error}</ErrorMessage>}
    </InputWrapper>
  );
};

// 样式定义
const InputWrapper = styled.div<{ $fullWidth: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
  width: ${props => props.$fullWidth ? '100%' : 'auto'};
`;

const Label = styled.label`
  font-size: ${theme.typography.fontSize.body};
  color: ${theme.colors.text.body};
  font-weight: ${theme.typography.fontWeight.normal};
`;

const InputContainer = styled.div<{
  $isFocused: boolean;
  $hasError: boolean;
  $disabled: boolean;
}>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  padding: 0 ${theme.spacing.md};
  height: 40px;
  background: ${theme.colors.secondary.white};
  border: 1px solid ${props =>
    props.$hasError
      ? theme.colors.status.error
      : props.$isFocused
        ? theme.colors.secondary.blue
        : theme.colors.secondary.gray
  };
  border-radius: ${theme.borderRadius.medium};
  transition: ${theme.transitions.fast};
  opacity: ${props => props.$disabled ? 0.6 : 1};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'text'};

  ${props => props.$isFocused && !props.$hasError && `
    box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.2);
  `}

  ${props => props.$hasError && `
    box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.2);
  `}
`;

const StyledInput = styled.input`
  flex: 1;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-family: ${theme.typography.fontFamily};
  font-size: ${theme.typography.fontSize.input};
  color: ${theme.colors.text.input};

  &::placeholder {
    color: ${theme.colors.text.placeholder};
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

const PrefixIcon = styled.span`
  display: flex;
  align-items: center;
  color: ${theme.colors.text.placeholder};
  font-size: 16px;
`;

const SuffixIcon = styled.span`
  display: flex;
  align-items: center;
  color: ${theme.colors.text.placeholder};
  font-size: 16px;
`;

const PasswordToggle = styled.button`
  display: flex;
  align-items: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  opacity: 0.6;
  transition: ${theme.transitions.fast};

  &:hover {
    opacity: 1;
  }
`;

const ErrorMessage = styled.span`
  font-size: 12px;
  color: ${theme.colors.status.error};
`;

export default Input;