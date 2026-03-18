/**
 * ============================================
 * FEEL ME - Service d'envoi d'emails
 * Utilise Nodemailer avec SMTP Gmail.
 * 
 * Design email : lumineux, fond blanc, accents dorés.
 * Inclut : infos entreprise, moyen de paiement,
 * facture PDF en pièce jointe.
 * 
 * Les infos entreprise sont chargées depuis la
 * table Settings en DB.
 * ============================================
 */

import nodemailer from 'nodemailer';
import { OrderAttributes, OrderItem } from './models/Order';
import { generateInvoicePDF, CompanyInfo, DEFAULT_COMPANY } from './invoice';
import Settings from './models/Settings';

/* --- Configuration du transporteur SMTP --- */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true pour 465, false pour 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Charge les infos entreprise depuis la table Settings.
 * Retourne les valeurs par défaut si la table est vide.
 */
async function loadCompanyInfo(): Promise<CompanyInfo> {
  try {
    const settings = await Settings.findByPk(1);
    if (settings) {
      const s = settings.toJSON();
      return {
        companyName: s.companyName || DEFAULT_COMPANY.companyName,
        companyEmail: s.companyEmail || DEFAULT_COMPANY.companyEmail,
        companyPhone: s.companyPhone || DEFAULT_COMPANY.companyPhone,
        companyAddress: s.companyAddress || DEFAULT_COMPANY.companyAddress,
        companyWebsite: s.companyWebsite || DEFAULT_COMPANY.companyWebsite,
      };
    }
  } catch (e) {
    console.warn('[EMAIL] Impossible de charger Settings, utilisation des valeurs par défaut');
  }
  return DEFAULT_COMPANY;
}

/**
 * Génère le HTML lumineux d'un récapitulatif de commande pour email.
 * Design : fond blanc, texte sombre, accents dorés, aéré.
 */
function generateInvoiceHTML(order: OrderAttributes, co: CompanyInfo): string {
  const payMethod = order.paymentMethod || 'PayTech';

  const itemsHTML = order.items.map((item: OrderItem) => `
    <tr>
      <td style="padding:10px 12px;font-size:14px;color:#333;border-bottom:1px solid #f0ead6;">${item.name}</td>
      <td style="padding:10px 8px;text-align:center;font-size:14px;color:#333;border-bottom:1px solid #f0ead6;">${item.quantity}</td>
      <td style="padding:10px 8px;text-align:right;font-size:14px;color:#333;border-bottom:1px solid #f0ead6;">${item.unitPrice.toLocaleString('fr-FR')} F</td>
      <td style="padding:10px 8px;text-align:right;font-size:14px;font-weight:600;color:#333;border-bottom:1px solid #f0ead6;">${(item.unitPrice * item.quantity).toLocaleString('fr-FR')} F</td>
    </tr>
  `).join('');

  return `
    <div style="max-width:600px;margin:0 auto;font-family:'Helvetica Neue',Arial,sans-serif;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #f0ead6;">
      <!-- En-tête lumineux doré -->
      <div style="background:linear-gradient(135deg,#f7f0dd,#fdf8ec);padding:28px 30px;text-align:center;border-bottom:2px solid #e8d48b;">
        <h1 style="margin:0;font-size:30px;color:#c9a84c;font-style:italic;">${co.companyName}</h1>
        <p style="margin:6px 0 0;font-size:11px;color:#b89a3e;letter-spacing:3px;text-transform:uppercase;">Les senteurs du paradis</p>
      </div>
      
      <!-- Corps -->
      <div style="padding:28px 30px;">
        <!-- Titre facture -->
        <table style="width:100%;margin-bottom:20px;"><tr>
          <td><h2 style="color:#c9a84c;font-size:18px;margin:0;">Commande ${order.ref}</h2></td>
          <td style="text-align:right;">
            <span style="background:#e8f5e9;color:#2e7d32;font-size:12px;font-weight:600;padding:5px 12px;border-radius:20px;">Paiement via ${payMethod}</span>
          </td>
        </tr></table>
        
        <!-- Infos client -->
        <div style="background:#fafaf5;border-radius:10px;padding:16px;margin-bottom:18px;">
          <p style="margin:0 0 4px;font-size:13px;color:#999;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Client</p>
          <p style="margin:0 0 3px;font-size:14px;color:#333;"><strong>${order.firstName} ${order.lastName}</strong></p>
          <p style="margin:0 0 3px;font-size:13px;color:#555;">${order.phone} &bull; ${order.email}</p>
          <p style="margin:0;font-size:13px;color:#555;">Livraison : ${order.address}</p>
        </div>
        
        <!-- Tableau des articles -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
          <thead>
            <tr style="background:#faf6eb;">
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#c9a84c;text-transform:uppercase;letter-spacing:0.5px;">Article</th>
              <th style="padding:10px 8px;text-align:center;font-size:12px;color:#c9a84c;text-transform:uppercase;">Qte</th>
              <th style="padding:10px 8px;text-align:right;font-size:12px;color:#c9a84c;text-transform:uppercase;">Prix unit.</th>
              <th style="padding:10px 8px;text-align:right;font-size:12px;color:#c9a84c;text-transform:uppercase;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        
        <!-- Total -->
        <div style="text-align:right;padding:14px 16px;background:#faf6eb;border-radius:10px;margin-bottom:16px;">
          <span style="font-size:18px;font-weight:700;color:#c9a84c;">Total : ${order.totalAmount.toLocaleString('fr-FR')} FCFA</span>
        </div>

        <!-- Moyen de paiement -->
        <div style="padding:10px 16px;background:#f0faf0;border-radius:10px;text-align:center;margin-bottom:16px;">
          <span style="font-size:13px;color:#2e7d32;font-weight:600;">Paiement confirme via ${payMethod}</span>
        </div>
      </div>
      
      <!-- Pied de page : infos entreprise -->
      <div style="background:#faf6eb;padding:18px 30px;text-align:center;border-top:1px solid #f0ead6;">
        <p style="margin:0 0 4px;font-size:12px;color:#c9a84c;font-weight:600;">${co.companyName}</p>
        <p style="margin:0 0 3px;font-size:11px;color:#999;">${co.companyEmail} &bull; ${co.companyPhone}</p>
        <p style="margin:0 0 6px;font-size:11px;color:#999;">${co.companyAddress} &bull; ${co.companyWebsite}</p>
        <p style="margin:0;font-size:11px;color:#bbb;">Merci pour votre confiance !</p>
      </div>
    </div>
  `;
}

/**
 * Envoie un email de confirmation + facture PDF au client.
 * Charge les infos entreprise depuis Settings, génère le PDF,
 * et joint la facture en pièce jointe.
 */
export async function sendOrderConfirmationEmail(order: OrderAttributes): Promise<void> {
  try {
    /* --- Charger infos entreprise depuis la DB --- */
    const co = await loadCompanyInfo();
    const invoiceHTML = generateInvoiceHTML(order, co);

    /* --- Générer le PDF de la facture --- */
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generateInvoicePDF(order, co);
      console.log(`[EMAIL] PDF facture genere pour ${order.ref} (${pdfBuffer.length} octets)`);
    } catch (pdfError) {
      console.error('[EMAIL] Erreur generation PDF, envoi sans piece jointe:', pdfError);
    }

    /* --- Construire le mail --- */
    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.SMTP_FROM || `${co.companyName} <${co.companyEmail}>`,
      to: order.email,
      subject: `${co.companyName} - Confirmation de commande ${order.ref}`,
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:620px;margin:0 auto;background:#ffffff;">
          <p style="font-size:15px;color:#333;margin:20px 0 8px;">Bonjour <strong>${order.firstName}</strong>,</p>
          <p style="font-size:14px;color:#555;margin:0 0 20px;">Merci pour votre commande ! Votre facture PDF est en piece jointe.</p>
          ${invoiceHTML}
          <p style="font-size:14px;color:#555;margin:20px 0 5px;">Nous vous contacterons tres bientot pour la livraison.</p>
          <p style="font-size:14px;color:#c9a84c;font-style:italic;margin:0;">L'equipe ${co.companyName}</p>
        </div>
      `,
    };

    /* --- Joindre le PDF si la generation a reussi --- */
    if (pdfBuffer) {
      mailOptions.attachments = [
        {
          filename: `Facture-${order.ref}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ];
    }

    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Confirmation + facture PDF envoyee a ${order.email}`);
  } catch (error) {
    console.error('[EMAIL] Erreur envoi confirmation:', error);
  }
}

/**
 * Envoie une notification de nouvelle commande a l'admin
 * avec la facture PDF en piece jointe.
 */
export async function sendAdminNotificationEmail(order: OrderAttributes): Promise<void> {
  try {
    /* --- Charger infos entreprise depuis la DB --- */
    const co = await loadCompanyInfo();
    const invoiceHTML = generateInvoiceHTML(order, co);
    const appUrl = process.env.APP_URL || 'https://feel-me.store';
    const payMethod = order.paymentMethod || 'PayTech';

    /* --- Generer le PDF de la facture --- */
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generateInvoicePDF(order, co);
    } catch (pdfError) {
      console.error('[EMAIL] Erreur generation PDF admin:', pdfError);
    }

    /* --- Construire le mail admin --- */
    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.SMTP_FROM || `${co.companyName} <${co.companyEmail}>`,
      to: process.env.SMTP_USER || co.companyEmail,
      subject: `Nouvelle commande ${order.ref} - ${order.totalAmount.toLocaleString('fr-FR')} FCFA (${payMethod})`,
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:620px;margin:0 auto;background:#ffffff;">
          <h2 style="color:#c9a84c;margin:20px 0 10px;">Nouvelle commande recue !</h2>
          <p style="font-size:14px;color:#555;margin:0 0 6px;">
            <strong>${order.firstName} ${order.lastName}</strong> a paye <strong>${order.totalAmount.toLocaleString('fr-FR')} FCFA</strong> via <strong>${payMethod}</strong>.
          </p>
          ${invoiceHTML}
          <p style="font-size:14px;color:#555;margin:20px 0 5px;">
            <a href="${appUrl}/admin" style="color:#c9a84c;font-weight:600;">Ouvrir le Dashboard Admin</a>
          </p>
        </div>
      `,
    };

    /* --- Joindre le PDF si disponible --- */
    if (pdfBuffer) {
      mailOptions.attachments = [
        {
          filename: `Facture-${order.ref}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ];
    }

    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Notification admin + facture PDF envoyee.`);
  } catch (error) {
    console.error('[EMAIL] Erreur envoi notification admin:', error);
  }
}

/**
 * Envoie un email au nouvel admin avec ses identifiants de connexion.
 * Le mot de passe est généré aléatoirement et envoyé en clair.
 * L'admin devra le changer après sa première connexion.
 */
export async function sendNewAdminEmail(email: string, password: string): Promise<void> {
  try {
    const co = await loadCompanyInfo();
    const appUrl = process.env.APP_URL || 'https://feel-me.store';

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `${co.companyName} <${co.companyEmail}>`,
      to: email,
      subject: `${co.companyName} - Votre compte administrateur`,
      html: `
        <div style="max-width:560px;margin:0 auto;font-family:'Helvetica Neue',Arial,sans-serif;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #f0ead6;">
          <div style="background:linear-gradient(135deg,#f7f0dd,#fdf8ec);padding:28px 30px;text-align:center;border-bottom:2px solid #e8d48b;">
            <h1 style="margin:0;font-size:26px;color:#c9a84c;font-style:italic;">${co.companyName}</h1>
            <p style="margin:6px 0 0;font-size:11px;color:#b89a3e;letter-spacing:3px;">ADMINISTRATION</p>
          </div>
          <div style="padding:30px;">
            <h2 style="color:#333;font-size:18px;margin:0 0 12px;">Bienvenue dans l'espace admin !</h2>
            <p style="font-size:14px;color:#555;margin:0 0 20px;">Un compte administrateur a ete cree pour vous. Voici vos identifiants de connexion :</p>
            <div style="background:#fafaf5;border-radius:10px;padding:20px;margin-bottom:20px;">
              <p style="margin:0 0 8px;font-size:14px;color:#333;"><strong>Email :</strong> ${email}</p>
              <p style="margin:0;font-size:14px;color:#333;"><strong>Mot de passe :</strong> <code style="background:#fff3e0;padding:3px 8px;border-radius:4px;font-size:15px;font-weight:bold;color:#c9a84c;">${password}</code></p>
            </div>
            <div style="background:#fff3e0;border-radius:10px;padding:14px;margin-bottom:20px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#e65100;font-weight:600;">Changez votre mot de passe des votre premiere connexion !</p>
            </div>
            <div style="text-align:center;">
              <a href="${appUrl}/admin/login" style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8d48b);color:#fff;text-decoration:none;padding:12px 30px;border-radius:10px;font-size:14px;font-weight:600;">Se connecter</a>
            </div>
          </div>
          <div style="background:#faf6eb;padding:16px 30px;text-align:center;border-top:1px solid #f0ead6;">
            <p style="margin:0;font-size:11px;color:#999;">${co.companyName} | ${co.companyEmail} | ${co.companyPhone}</p>
          </div>
        </div>
      `,
    });
    console.log(`[EMAIL] Mail identifiants admin envoye a ${email}`);
  } catch (error) {
    console.error('[EMAIL] Erreur envoi mail nouvel admin:', error);
  }
}
