/**
 * ============================================
 * FEEL ME - Service d'envoi d'emails
 * Utilise Nodemailer avec SMTP Gmail
 * Fonctions : envoi notification admin,
 * envoi confirmation + facture PDF client
 * 
 * La facture PDF est générée via PDFKit
 * et jointe en pièce jointe aux emails.
 * ============================================
 */

import nodemailer from 'nodemailer';
import { OrderAttributes, OrderItem } from './models/Order';
import { generateInvoicePDF } from './invoice';

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
 * Génère le HTML d'une facture pour un email
 */
function generateInvoiceHTML(order: OrderAttributes): string {
  const itemsHTML = order.items.map((item: OrderItem) => `
    <tr style="border-bottom:1px solid #f0e6d3;">
      <td style="padding:12px 8px;font-size:14px;color:#333;">${item.name}</td>
      <td style="padding:12px 8px;text-align:center;font-size:14px;color:#333;">${item.quantity}</td>
      <td style="padding:12px 8px;text-align:right;font-size:14px;color:#333;">${item.unitPrice.toLocaleString('fr-FR')} FCFA</td>
      <td style="padding:12px 8px;text-align:right;font-size:14px;font-weight:600;color:#333;">${(item.unitPrice * item.quantity).toLocaleString('fr-FR')} FCFA</td>
    </tr>
  `).join('');

  return `
    <div style="max-width:600px;margin:0 auto;font-family:'Helvetica Neue',Arial,sans-serif;background:#fffdf9;border:1px solid #f0e6d3;border-radius:12px;overflow:hidden;">
      <!-- En-tête -->
      <div style="background:linear-gradient(135deg,#c9a84c,#e8d48b);padding:30px;text-align:center;">
        <h1 style="margin:0;font-size:28px;color:#fff;font-style:italic;text-shadow:1px 1px 2px rgba(0,0,0,0.2);">Feel Me</h1>
        <p style="margin:5px 0 0;font-size:13px;color:#fff;letter-spacing:2px;">LES SENTEURS DU PARADIS</p>
      </div>
      
      <!-- Corps -->
      <div style="padding:30px;">
        <h2 style="color:#c9a84c;font-size:20px;margin:0 0 20px;">Facture - Commande ${order.ref}</h2>
        
        <!-- Infos client -->
        <div style="background:#fff;border:1px solid #f0e6d3;border-radius:8px;padding:15px;margin-bottom:20px;">
          <p style="margin:0 0 5px;font-size:14px;"><strong>Client :</strong> ${order.firstName} ${order.lastName}</p>
          <p style="margin:0 0 5px;font-size:14px;"><strong>Téléphone :</strong> ${order.phone}</p>
          <p style="margin:0 0 5px;font-size:14px;"><strong>Email :</strong> ${order.email}</p>
          <p style="margin:0;font-size:14px;"><strong>Adresse de livraison :</strong> ${order.address}</p>
        </div>
        
        <!-- Tableau des articles -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr style="background:#f9f3e8;border-bottom:2px solid #c9a84c;">
              <th style="padding:10px 8px;text-align:left;font-size:13px;color:#c9a84c;text-transform:uppercase;">Article</th>
              <th style="padding:10px 8px;text-align:center;font-size:13px;color:#c9a84c;text-transform:uppercase;">Qté</th>
              <th style="padding:10px 8px;text-align:right;font-size:13px;color:#c9a84c;text-transform:uppercase;">Prix unit.</th>
              <th style="padding:10px 8px;text-align:right;font-size:13px;color:#c9a84c;text-transform:uppercase;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        
        <!-- Total -->
        <div style="text-align:right;padding:15px;background:#f9f3e8;border-radius:8px;">
          <span style="font-size:18px;font-weight:700;color:#c9a84c;">Total : ${order.totalAmount.toLocaleString('fr-FR')} FCFA</span>
        </div>
        
        <!-- Statut -->
        <div style="margin-top:20px;padding:12px;background:#e8f5e9;border-radius:8px;text-align:center;">
          <span style="font-size:14px;color:#2e7d32;font-weight:600;">✅ Paiement confirmé</span>
        </div>
      </div>
      
      <!-- Pied de page -->
      <div style="background:#f9f3e8;padding:20px;text-align:center;border-top:1px solid #f0e6d3;">
        <p style="margin:0;font-size:12px;color:#999;">Feel Me - Les senteurs du paradis</p>
        <p style="margin:5px 0 0;font-size:12px;color:#999;">Merci pour votre confiance ❤️</p>
      </div>
    </div>
  `;
}

/**
 * Envoie un email de confirmation + facture PDF au client.
 * Le PDF est généré via PDFKit et joint en pièce jointe.
 */
export async function sendOrderConfirmationEmail(order: OrderAttributes): Promise<void> {
  try {
    const invoiceHTML = generateInvoiceHTML(order);

    /* --- Générer le PDF de la facture --- */
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generateInvoicePDF(order);
      console.log(`[EMAIL] PDF facture généré pour ${order.ref} (${pdfBuffer.length} octets)`);
    } catch (pdfError) {
      console.error('[EMAIL] Erreur génération PDF, envoi sans pièce jointe:', pdfError);
    }

    /* --- Construire le mail avec pièce jointe PDF si disponible --- */
    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.SMTP_FROM || 'Feel Me <softechiris@gmail.com>',
      to: order.email,
      subject: `Feel Me - Confirmation de commande ${order.ref}`,
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;">
          <p style="font-size:16px;color:#333;">Bonjour <strong>${order.firstName}</strong>,</p>
          <p style="font-size:14px;color:#555;">Merci pour votre commande ! Votre facture est en pièce jointe.</p>
          ${invoiceHTML}
          <p style="font-size:14px;color:#555;margin-top:20px;">Nous vous contacterons très bientôt pour la livraison.</p>
          <p style="font-size:14px;color:#c9a84c;font-style:italic;">L'équipe Feel Me</p>
        </div>
      `,
    };

    /* --- Joindre le PDF si la génération a réussi --- */
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
    console.log(`[EMAIL] Confirmation + facture PDF envoyée à ${order.email}`);
  } catch (error) {
    console.error('[EMAIL] Erreur envoi confirmation:', error);
  }
}

/**
 * Envoie une notification de nouvelle commande à l'admin
 * avec la facture PDF en pièce jointe.
 */
export async function sendAdminNotificationEmail(order: OrderAttributes): Promise<void> {
  try {
    const invoiceHTML = generateInvoiceHTML(order);
    const appUrl = process.env.APP_URL || 'https://feel-me.store';

    /* --- Générer le PDF de la facture --- */
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generateInvoicePDF(order);
    } catch (pdfError) {
      console.error('[EMAIL] Erreur génération PDF admin:', pdfError);
    }

    /* --- Construire le mail admin --- */
    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.SMTP_FROM || 'Feel Me <softechiris@gmail.com>',
      to: process.env.SMTP_USER || 'softechiris@gmail.com',
      subject: `Nouvelle commande ${order.ref} - ${order.totalAmount.toLocaleString('fr-FR')} FCFA`,
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;">
          <h2 style="color:#c9a84c;">Nouvelle commande reçue !</h2>
          <p style="font-size:14px;color:#555;">
            <strong>${order.firstName} ${order.lastName}</strong> vient de passer une commande.
          </p>
          ${invoiceHTML}
          <p style="font-size:14px;color:#555;margin-top:20px;">
            Connectez-vous au <a href="${appUrl}/admin" style="color:#c9a84c;">Dashboard Admin</a> pour gérer cette commande.
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
    console.log(`[EMAIL] Notification admin + facture PDF envoyée.`);
  } catch (error) {
    console.error('[EMAIL] Erreur envoi notification admin:', error);
  }
}
