import { transporter } from "../config/mailer.js";
import { appName } from "./constant.js";
import emailTemplate from "./mail_template.js";

export const sendEmail = async (to, subject, content) => {
  const html = emailTemplate(subject, content);
  try {
    const info = await transporter.sendMail({
      from: `${appName} <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log("✅ Email envoyé :", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Erreur envoi email :", error);
    return false;
  }
};


export const sendToTech = async (error) => {
  const html = emailTemplate("Erreur sur l'application", error);
  try {
    const info = await transporter.sendMail({
      from: `${appName} <${process.env.SMTP_USER}>`,
      to: process.env.TECH_EMAIL,
      subject: "[TECH] : Erreur sur l'application",
      html,
    });

    console.log("✅ Email envoyé :", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Erreur envoi email :", error);
    return false;
  }
};