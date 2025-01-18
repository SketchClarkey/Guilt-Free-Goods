import zod from 'zod';

export interface PasswordValidationConfig {
  minLength?: number;
  maxLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  maxRepeatingChars?: number;
  bannedPasswords?: string[];
}

const defaultConfig: PasswordValidationConfig = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxRepeatingChars: 3,
  bannedPasswords: [
    'password',
    '12345678',
    'qwerty123',
    'admin123',
  ],
};

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const createPasswordValidator = (config: PasswordValidationConfig = {}) => {
  const finalConfig = { ...defaultConfig, ...config };

  return (password: string): ValidationResult => {
    const errors: string[] = [];

    // Basic length check
    if (password.length < finalConfig.minLength!) {
      errors.push(`Password must be at least ${finalConfig.minLength} characters long`);
    }
    if (password.length > finalConfig.maxLength!) {
      errors.push(`Password must not exceed ${finalConfig.maxLength} characters`);
    }

    // Character type checks
    if (finalConfig.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (finalConfig.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (finalConfig.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (finalConfig.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Repeating characters check
    if (finalConfig.maxRepeatingChars) {
      const repeatingRegex = new RegExp(`(.)\\1{${finalConfig.maxRepeatingChars},}`);
      if (repeatingRegex.test(password)) {
        errors.push(`Password must not contain more than ${finalConfig.maxRepeatingChars} repeating characters`);
      }
    }

    // Banned passwords check
    if (finalConfig.bannedPasswords?.includes(password.toLowerCase())) {
      errors.push('This password is too common or has been compromised');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };
};

// Zod schema for password validation
export const createPasswordSchema = (config: PasswordValidationConfig = {}) => {
  const finalConfig = { ...defaultConfig, ...config };
  
  return zod.string()
    .min(finalConfig.minLength!, `Password must be at least ${finalConfig.minLength} characters long`)
    .max(finalConfig.maxLength!, `Password must not exceed ${finalConfig.maxLength} characters`)
    .regex(
      /[A-Z]/,
      { message: 'Password must contain at least one uppercase letter' }
    )
    .regex(
      /[a-z]/,
      { message: 'Password must contain at least one lowercase letter' }
    )
    .regex(
      /\d/,
      { message: 'Password must contain at least one number' }
    )
    .regex(
      /[!@#$%^&*(),.?":{}|<>]/,
      { message: 'Password must contain at least one special character' }
    )
    .refine(
      (password) => !finalConfig.bannedPasswords?.includes(password.toLowerCase()),
      { message: 'This password is too common or has been compromised' }
    );
}; 