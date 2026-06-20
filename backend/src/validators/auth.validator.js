const validateRegister = (data) => {
  const { username, email, password } = data;
  const errors = [];

  if (!username || !email || !password) {
    errors.push('Username, email, and password are required');
  }

  if (password && password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  return errors;
};

module.exports = {
  validateRegister
};
