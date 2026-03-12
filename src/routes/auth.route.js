import { Router } from "express";
import { login, logout, profile, register, forgotPassword, resetPassword, changePassword } from "../controllers/auth.controller.js";
import { upload } from "../middleware/upload.middleware.js";

const authRoutes = Router();

authRoutes.post('/register', upload('cip').single('cip'), register);
authRoutes.post('/login', login);
authRoutes.get('/logout', logout);
authRoutes.get('/profile', profile);
authRoutes.post('/forgot-password', forgotPassword);
authRoutes.post('/reset-password', resetPassword);
authRoutes.post('/change-password', changePassword);

export default authRoutes;