import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const isUser = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: true, message: 'No token, authorization denied' });
  }
  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(403).json({ error: true, message: 'Access denied. User only' });
    }

    if (!user.status) {
      return res.status(403).json({ error: true, message: 'Account is locked or inactive' });
    }

    req.user = user;
    next();

  } catch (error) {
    return res.status(401).json({ error: true, message: 'Token is not valid' });
  }
};

export default isUser;
