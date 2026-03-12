import { appName } from "./constant.js";

const APP_NAME = appName;

const colors = {
  // ── Brand palette (night theme) ──────────────────────────────────────────
  primary: '#c9a84c',   // or DPV
  primaryDark: '#a8872e',   // or foncé (hover)
  primaryLight: '#f5e6bc',   // or clair (highlights)
  primaryGlow: 'rgba(201,168,76,0.12)', // reflet doré pour bg-cells

  accent: '#433719',   // brun doré (badge bg)
  accentContent: '#c9a84c',   // texte sur accent

  base100: '#0d0d1a',   // fond global
  base200: '#12122a',   // container principal
  base300: '#1a1a35',   // cellules alternées, footer
  baseContent: '#e8e8f0',   // texte principal
  baseMuted: '#9090a8',   // texte secondaire
  baseFaint: '#3a3a5c',   // bordures, séparateurs

  success: '#34d399',
  info: '#60a5fa',
  warning: '#fbbf24',
  error: '#f87171',
};

/**
 * DPV Email Template
 *
 * @param {string} title        — Titre principal affiché en haut du corps
 * @param {string} message      — Corps HTML du message
 * @param {string|null} ctaLink — URL du bouton CTA (optionnel)
 * @param {string|null} ctaText — Texte du bouton CTA (optionnel)
 * @param {Object} options      — Options avancées
 * @param {'info'|'success'|'warning'|'error'|null} options.alertType — Banderole colorée en tête
 * @param {string|null} options.preheader — Texte de prévisualisation (invisible dans l'email)
 * @param {string|null} options.footerNote — Note additionnelle dans le footer
 */
export const emailTemplate = (
  title,
  message,
  ctaLink = null,
  ctaText = null,
  options = {}
) => {
  const { alertType = null, preheader = null, footerNote = null } = options;

  const alertConfig = {
    info: { bg: '#1e3a5f', border: colors.info, icon: 'ℹ', text: colors.info },
    success: { bg: '#0d3328', border: colors.success, icon: '✓', text: colors.success },
    warning: { bg: '#3d2e00', border: colors.warning, icon: '⚠', text: colors.warning },
    error: { bg: '#3d1010', border: colors.error, icon: '✕', text: colors.error },
  };
  const alert = alertType ? alertConfig[alertType] : null;

  return `<!DOCTYPE html>
<html lang="fr" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${APP_NAME} — ${title}</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* ── Reset ── */
    *, *::before, *::after { box-sizing: border-box; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    a { color: ${colors.primary}; text-decoration: none; }

    /* ── Base ── */
    body {
      margin: 0; padding: 0;
      background-color: ${colors.base100};
      font-family: 'Georgia', 'Times New Roman', serif;
      color: ${colors.baseContent};
    }

    /* ── Layout ── */
    .email-wrapper  { width: 100%; background-color: ${colors.base100}; padding: 40px 16px; }
    .email-outer    { max-width: 600px; margin: 0 auto; }

    /* ── Header band ── */
    .header-band    {
      background-color: ${colors.base200};
      border-radius: 12px 12px 0 0;
      border: 1px solid ${colors.baseFaint};
      border-bottom: none;
      padding: 28px 36px 24px;
    }
    .header-logo-text {
      font-family: 'Georgia', serif;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 4px;
      color: ${colors.primary};
    }
    .header-tagline {
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: ${colors.baseMuted};
      margin-top: 3px;
    }

    /* ── Gold divider line ── */
    .gold-line {
      height: 2px;
      background: linear-gradient(to right, transparent, ${colors.primary}, transparent);
      border: none;
      margin: 0;
    }
    /* Outlook fallback for gradient */
    .gold-line-fallback { height: 2px; background-color: ${colors.primary}; }

    /* ── Body card ── */
    .body-card {
      background-color: ${colors.base200};
      border: 1px solid ${colors.baseFaint};
      border-top: none;
      border-bottom: none;
      padding: 36px 36px 28px;
    }

    /* ── Alert band ── */
    .alert-band {
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 28px;
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      font-weight: 600;
    }

    /* ── Title ── */
    .email-title {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 28px;
      font-weight: 700;
      color: ${colors.baseContent};
      line-height: 1.25;
      margin: 0 0 24px 0;
      letter-spacing: -0.3px;
    }
    .email-title em {
      font-style: italic;
      color: ${colors.primary};
      font-weight: 400;
    }

    /* ── Body text ── */
    .email-body {
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      font-size: 15px;
      line-height: 1.75;
      color: ${colors.baseContent};
    }
    .email-body p  { margin: 0 0 16px 0; }
    .email-body ul { margin: 0 0 16px 0; padding-left: 20px; }
    .email-body li { margin-bottom: 6px; }
    .email-body strong { color: ${colors.primary}; font-weight: 600; }
    .email-body a  { color: ${colors.primary}; text-decoration: underline; text-underline-offset: 3px; }

    /* ── Info box (utilisable dans message) ── */
    .info-box {
      background-color: ${colors.base300};
      border-left: 3px solid ${colors.primary};
      border-radius: 0 6px 6px 0;
      padding: 14px 18px;
      margin: 20px 0;
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      color: ${colors.baseMuted};
      line-height: 1.6;
    }

    /* ── Code / OTP block ── */
    .code-block {
      background-color: ${colors.accent};
      border: 1px solid ${colors.primary};
      border-radius: 8px;
      padding: 20px 24px;
      text-align: center;
      margin: 24px 0;
    }
    .code-value {
      font-family: 'Courier New', 'Lucida Console', monospace;
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 10px;
      color: ${colors.primary};
    }
    .code-label {
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: ${colors.baseMuted};
      margin-top: 6px;
    }

    /* ── Key-value data row ── */
    .data-table    { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .data-row td   { padding: 10px 14px; font-size: 14px; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; }
    .data-row:nth-child(odd)  td { background-color: ${colors.base300}; }
    .data-row:nth-child(even) td { background-color: ${colors.base200}; }
    .data-key   { color: ${colors.baseMuted}; width: 40%; border-radius: 4px 0 0 4px; }
    .data-value { color: ${colors.baseContent}; font-weight: 600; border-radius: 0 4px 4px 0; }

    /* ── Badge / tag ── */
    .badge {
      display: inline-block;
      background-color: ${colors.accent};
      color: ${colors.primary};
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 3px 10px;
      border-radius: 999px;
      border: 1px solid ${colors.primary};
      vertical-align: middle;
    }

    /* ── CTA button ── */
    .cta-wrap { text-align: center; margin: 32px 0 8px; }
    .cta-btn  {
      display: inline-block;
      background-color: ${colors.primary};
      color: ${colors.base100} !important;
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      text-decoration: none !important;
      padding: 14px 36px;
      border-radius: 6px;
      border: 1px solid ${colors.primary};
    }
    .cta-sub {
      text-align: center;
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      color: ${colors.baseMuted};
      margin-top: 10px;
    }
    .cta-link-raw { word-break: break-all; color: ${colors.primary}; font-size: 12px; }

    /* ── Separator ── */
    .sep {
      border: none;
      border-top: 1px solid ${colors.baseFaint};
      margin: 28px 0 0;
    }

    /* ── Footer ── */
    .footer-card {
      background-color: ${colors.base300};
      border: 1px solid ${colors.baseFaint};
      border-top: none;
      border-radius: 0 0 12px 12px;
      padding: 24px 36px 28px;
      text-align: center;
    }
    .footer-links a {
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      color: ${colors.baseMuted};
      text-decoration: none;
      margin: 0 10px;
    }
    .footer-links a:hover { color: ${colors.primary}; }
    .footer-copy {
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      color: ${colors.baseMuted};
      margin-top: 10px;
      line-height: 1.6;
    }
    .footer-no-reply {
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      color: ${colors.baseFaint};
      margin-top: 6px;
    }

    /* ── Responsive ── */
    @media only screen and (max-width: 620px) {
      .email-wrapper  { padding: 0 !important; }
      .email-outer    { width: 100% !important; }
      .header-band,
      .body-card,
      .footer-card    { padding-left: 20px !important; padding-right: 20px !important; }
      .email-title    { font-size: 22px !important; }
      .code-value     { font-size: 28px !important; letter-spacing: 6px !important; }
      .cta-btn        { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body>

${preheader ? `<!-- Preheader (hidden preview text) -->
<div style="display:none;font-size:1px;color:${colors.base100};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
  ${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌
</div>` : ''}

<div class="email-wrapper">
<div class="email-outer">

  <!-- ═══════════════════════════ HEADER ═══════════════════════════ -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
    <tr>
      <td class="header-band">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
          <tr>
            <td>
              <div class="header-logo-text">${APP_NAME}</div>
              <div class="header-tagline">Plateforme · Sécurité · Confiance</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Ligne dorée séparatrice -->
    <tr>
      <td style="padding: 0; line-height: 0; font-size: 0;">
        <!--[if !mso]><!-->
        <div class="gold-line"></div>
        <!--<![endif]-->
        <!--[if mso]><div class="gold-line-fallback"></div><![endif]-->
      </td>
    </tr>
  </table>

  <!-- ═══════════════════════════ BODY ════════════════════════════ -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
    <tr>
      <td class="body-card">

        ${alert ? `
        <!-- Alert band -->
        <div class="alert-band" style="background-color: ${alert.bg}; border: 1px solid ${alert.border}; color: ${alert.text};">
          <span style="margin-right: 8px; font-size: 15px;">${alert.icon}</span>
          ${alertType === 'info' ? 'Information' :
        alertType === 'success' ? 'Succès' :
          alertType === 'warning' ? 'Attention' : 'Erreur'}
        </div>` : ''}

        <!-- Title -->
        <h1 class="email-title">${title}</h1>

        <!-- Body content -->
        <div class="email-body">
          ${message}
        </div>

        ${ctaLink && ctaText ? `
        <!-- CTA button -->
        <div class="cta-wrap">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
            href="${ctaLink}"
            style="height:48px;v-text-anchor:middle;width:220px;"
            arcsize="8%"
            stroke="f"
            fillcolor="${colors.primary}">
            <w:anchorlock/>
            <center style="color:${colors.base100};font-family:sans-serif;font-size:14px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;">${ctaText}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${ctaLink}" class="cta-btn" target="_blank" rel="noopener noreferrer">
            ${ctaText}
          </a>
          <!--<![endif]-->
          <p class="cta-sub">
            Ou copiez ce lien dans votre navigateur&nbsp;:<br>
            <a href="${ctaLink}" class="cta-link-raw">${ctaLink}</a>
          </p>
        </div>` : ''}

        <hr class="sep">

      </td>
    </tr>
  </table>

  <!-- ══════════════════════════ FOOTER ════════════════════════════ -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
    <tr>
      <td class="footer-card">

        <div class="footer-links" style="margin-bottom: 12px;">
          <a href="#">Mentions légales</a>
          <a href="#">Confidentialité</a>
          <a href="#">Support</a>
          ${footerNote ? `<a href="#">${footerNote}</a>` : ''}
        </div>

        <!-- Mini gold line -->
        <div style="width: 40px; height: 1px; background-color: ${colors.primary}; margin: 12px auto;"></div>

        <p class="footer-copy">
          © ${new Date().getFullYear()} ${APP_NAME}. Tous droits réservés.
        </p>
        <p class="footer-no-reply">
          Cet e-mail a été envoyé automatiquement — merci de ne pas y répondre.
        </p>

      </td>
    </tr>
  </table>

</div>
</div>

</body>
</html>`;
};

export default emailTemplate;