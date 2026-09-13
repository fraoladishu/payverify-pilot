const bcrypt = require('bcryptjs');

/**
 * Validates a password against the strict policy:
 * - Long: At least 16 characters long.
 * - Random/Complex: Mix of uppercase, lowercase, numbers, and symbols, OR a passphrase of 5-7 words.
 */
function validateStrongPassword(password) {
  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      message: 'Password is required and must be text.'
    };
  }

  const trimmed = password.trim();

  // 1. Length Requirement (At least 16 characters long)
  if (trimmed.length < 16) {
    return {
      valid: false,
      message: 'Password must be at least 16 characters long (more is better).'
    };
  }

  // 2. Check if passphrase of 5-7 words (separated by spaces or hyphens)
  const words = trimmed.split(/[\s\-]+/).filter(w => w.length >= 2);
  const isPassphrase = words.length >= 5 && trimmed.length >= 16;

  // 3. Complexity Check: uppercase, lowercase, numbers, symbols
  const hasUpper = /[A-Z]/.test(trimmed);
  const hasLower = /[a-z]/.test(trimmed);
  const hasNumber = /[0-9]/.test(trimmed);
  const hasSymbol = /[^A-Za-z0-9]/.test(trimmed);

  const isComplex = hasUpper && hasLower && hasNumber && hasSymbol;

  if (!isComplex && !isPassphrase) {
    return {
      valid: false,
      message: 'Strong password required: Must contain a mix of uppercase letters, lowercase letters, numbers, and symbols (or be a passphrase of 5–7 unrelated words).'
    };
  }

  return { valid: true };
}

/**
 * Checks that the password is not reused across existing staff accounts.
 */
async function checkPasswordUnique(password, existingUsers = [], currentUserId = null) {
  for (const user of existingUsers) {
    if (currentUserId && Number(user.id) === Number(currentUserId)) {
      continue;
    }
    if (user.password_hash) {
      const match = await bcrypt.compare(password, user.password_hash);
      if (match) {
        return {
          unique: false,
          message: 'Password must be unique. This password is already assigned to another staff account.'
        };
      }
    }
  }
  return { unique: true };
}

module.exports = {
  validateStrongPassword,
  checkPasswordUnique
};
