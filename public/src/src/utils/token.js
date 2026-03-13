import jwt from 'jsonwebtoken';

export function getToken(data) {
  const token = jwt.sign(
    data,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN, algorithm: "HS256" }
  );

  return token;
}

export function verifyToken(token) {
  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;

  } catch (error) {
    console.error('Token invalide ou expiré :', error.message);
    return null;
  }
}