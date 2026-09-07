const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'divide_and_rule_super_secret_jwt_key_2026');

      const user = await User.findById(decoded.id).select('-passwordHash');
      if (!user) {
        return res.status(401).json({ error: 'User associated with this token no longer exists' });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'User account has been deactivated' });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }
  } else {
    return res.status(401).json({ error: 'Authorization token required in Bearer format' });
  }
};

module.exports = { protect };
