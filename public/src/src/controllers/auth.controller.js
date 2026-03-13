import { sendResponse } from "../utils/response.js"
import {
    loginSchema,
    registerSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
} from "../validations/auth.js";
import { prisma } from '../config/prisma.js'
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getToken, verifyToken } from "../utils/token.js";
import { appUrl } from "../utils/constant.js";
import { sendEmail } from "../utils/mail.js";

export const register = async (req, res) => {
    try {
        const body = req.body;
        const parsed = registerSchema.safeParse(body);

        if (!parsed.success) {
            const error = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
            return sendResponse(res, false, error);
        }

        if (!req.file) return sendResponse(res, false, 'CIP obligatoire');

        const cip = `uploads/cip/${req.file.filename}`;
        const { firstName, lastName, email, npi, password, role } = parsed.data;

        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { npi }] },
        });

        if (existingUser) {
            const field = existingUser.email === email ? "email" : "NPI";
            return sendResponse(res, false, `Ce ${field} est déjà utilisé`);
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                npi,
                cip,
                password: hashedPassword,
                role,
            },
        });

        return sendResponse(res, true, "Compte créé avec succès");
    } catch (error) {
        console.error("[REGISTER]", error);
        return sendResponse(res, false, "Erreur serveur");
    }
}

export const login = async (req, res) => {
    try {
        const body = req.body;
        const parsed = loginSchema.safeParse(body);

        if (!parsed.success) {
            const error = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
            return sendResponse(res, false, error);
        }

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return sendResponse(res, false, "Email ou mot de passe incorrect");
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return sendResponse(res, false, "Email ou mot de passe incorrect");
        }

        if (!user.isVerify) {
            return sendResponse(res, false, "Votre compte en cours de validation");
        }

        if (!user.isActif) {
            return sendResponse(res, false, "Votre compte est suspendu. Contactez le service client.");
        }

        const token = getToken(user);

        const isProd = process.env.NODE_ENV === "production";

        res.cookie(isProd ? "__Host-token" : "token", token, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return sendResponse(res, true, "Connexion réussie");
    } catch (error) {
        console.error("[LOGIN]", error);
        return sendResponse(res, false, "Erreur serveur");
    }
};

export const logout = async (req, res) => {
    res.clearCookie("__Host-token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
    });
    
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
    });

    return sendResponse(res, true, "Déconnexion réussie");
};

export const profile = async (req, res) => {
    try {
        const token = req.cookies["__Host-token"] || req.cookies.token;

        if (!token) {
            return sendResponse(res, false, "Non autorisé");
        }

        const decoded = verifyToken(token);

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                npi: true,
                cip: true,
                role: true,
                image: true,
                createdAt: true,
            },
        });

        if (!user) {
            return sendResponse(res, false, "Utilisateur introuvable");
        }

        return sendResponse(res, true, "Information de l'utilisateur", user);
    } catch (error) {
        console.error("[PROFILE]", error);
        return sendResponse(res, false, "Erreur serveur");
    }
}

export const forgotPassword = async (req, res) => {
    try {
        const parsed = forgotPasswordSchema.safeParse(req.body);

        if (!parsed.success) {
            const error = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
            return sendResponse(res, false, error);
        }

        const { email } = parsed.data;

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return sendResponse(res, false, "Aucun compte associé à cette adresse email");
        }

        await prisma.passwordResetToken.updateMany({
            where: {
                userId: user.id,
                used: false,
            },
            data: {
                used: true,
            },
        });

        const resetToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 min

        await prisma.passwordResetToken.create({
            data: {
                token: resetToken,
                userId: user.id,
                expiresAt,
            },
        });

        const resetUrl = `${appUrl}/auth/forget-password?token=${resetToken}`;

        const isSend = await sendEmail(
            user.email,
            'Reinitialisation de mot de passe',
            `Voici le lien de reinitialisation ${resetUrl}`
        );

        if (!isSend) {
            return sendResponse(
                res,
                false,
                "Erreur lors de l'envoi du lien. Veuillez réssayer."
            );
        }

        return sendResponse(
            res,
            true,
            "Un lien de réinitialisation a été envoyé sur votre email"
        );
    } catch (error) {
        console.error("[FORGOT_PASSWORD]", error);
        return sendResponse(res, false, "Erreur serveur");
    }
};

export const resetPassword = async (req, res) => {
    try {
        const parsed = resetPasswordSchema.safeParse(req.body);

        if (!parsed.success) {
            const error = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
            return sendResponse(res, false, error);
        }

        const { token, password } = parsed.data;

        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!resetToken) {
            return sendResponse(res, false, "Token invalide");
        }

        if (resetToken.used) {
            return sendResponse(res, false, "Ce lien a déjà été utilisé");
        }

        if (new Date(resetToken.expiresAt) < new Date()) {
            return sendResponse(res, false, "Ce lien a expiré");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.$transaction([
            prisma.user.update({
                where: { id: resetToken.userId },
                data: { password: hashedPassword },
            }),
            prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { used: true },
            }),
            prisma.passwordResetToken.updateMany({
                where: {
                    userId: resetToken.userId,
                    used: false,
                    id: { not: resetToken.id },
                },
                data: { used: true },
            }),
        ]);

        return sendResponse(res, true, "Mot de passe réinitialisé avec succès");
    } catch (error) {
        console.error("[RESET_PASSWORD]", error);
        return sendResponse(res, false, "Erreur serveur");
    }
};

export const changePassword = async (req, res) => {
    try {
        const token = req.cookies["__Host-token"] || req.cookies.token;

        if (!token) {
            return sendResponse(res, false, "Non autorisé");
        }

        const decoded = verifyToken(token);

        const parsed = changePasswordSchema.safeParse(req.body);

        if (!parsed.success) {
            const error = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
            return sendResponse(res, false, error);
        }

        const { currentPassword, newPassword } = parsed.data;

        const userId = decoded.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return sendResponse(res, false, "Utilisateur introuvable");
        }

        const isValidPassword = await bcrypt.compare(currentPassword, user.password);

        if (!isValidPassword) {
            return sendResponse(res, false, "Mot de passe actuel incorrect");
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password);

        if (isSamePassword) {
            return sendResponse(res, false, "Le nouveau mot de passe doit être différent de l'ancien");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
            },
        });

        await prisma.passwordResetToken.updateMany({
            where: {
                userId,
                used: false,
            },
            data: {
                used: true,
            },
        });

        return sendResponse(res, true, "Mot de passe modifié avec succès");
    } catch (error) {
        console.error("[CHANGE_PASSWORD]", error);
        return sendResponse(res, false, "Erreur serveur");
    }
};
