/**
 * ============================================
 * FEEL ME - Génération de factures PDF
 * Utilise PDFKit pour créer des factures
 * professionnelles avec :
 *   - En-tête doré Feel Me + infos entreprise
 *   - Infos client et livraison
 *   - Tableau des articles
 *   - Moyen de paiement (Wave, OM, etc.)
 *   - Total et statut de paiement
 *   - Pied de page avec coordonnées entreprise
 * 
 * Retourne un Buffer PDF prêt à être :
 *   - Joint en pièce jointe email (Nodemailer)
 *   - Téléchargé via une route API
 * ============================================
 */

import PDFDocument from 'pdfkit';
import { OrderAttributes, OrderItem } from './models/Order';

/**
 * Infos entreprise passées à la génération PDF.
 * Récupérées depuis la table Settings en DB.
 */
export interface CompanyInfo {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyWebsite: string;
}

/**
 * Formate un nombre en prix lisible (ex: 3 500)
 * On n'utilise PAS toLocaleString car sur Vercel serverless
 * il peut produire '3/500' au lieu de '3 500'.
 */
function formatPrice(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/* --- Valeurs par défaut si Settings non chargées --- */
export const DEFAULT_COMPANY: CompanyInfo = {
  companyName: 'Feel Me',
  companyEmail: 'softechiris@gmail.com',
  companyPhone: '+221 77 000 00 00',
  companyAddress: 'Dakar, Sénégal',
  companyWebsite: 'www.feel-me.store',
};

/**
 * Génère un Buffer PDF contenant la facture d'une commande.
 * @param order - Les données complètes de la commande
 * @param company - Les infos entreprise (optionnel, défaut si absent)
 * @returns Promise<Buffer> - Le PDF sous forme de Buffer
 */
export async function generateInvoicePDF(order: OrderAttributes, company?: CompanyInfo): Promise<Buffer> {
  const co = company || DEFAULT_COMPANY;
  return new Promise((resolve, reject) => {
    try {
      /* --- Créer le document PDF (A4) --- */
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Facture ${order.ref}`,
          Author: 'Feel Me',
          Subject: `Facture commande ${order.ref}`,
        },
      });

      /* --- Collecter les chunks dans un buffer --- */
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      /* --- Couleurs de la charte Feel Me --- */
      const gold = '#c9a84c';
      const darkText = '#1a1410';
      const grayText = '#666666';
      const lightBg = '#f9f3e8';
      const borderColor = '#e8d48b';

      /* ===================================================
         EN-TÊTE : Bandeau doré + nom entreprise
         =================================================== */
      doc.rect(0, 0, doc.page.width, 100).fill(gold);
      
      /* Titre entreprise centré en blanc */
      doc.font('Helvetica-Bold')
        .fontSize(32)
        .fillColor('#ffffff')
        .text(co.companyName, 0, 25, { align: 'center' });

      /* Sous-titre */
      doc.font('Helvetica')
        .fontSize(10)
        .fillColor('#ffffff')
        .text('LES SENTEURS DU PARADIS', 0, 62, { align: 'center', characterSpacing: 3 });

      /* ===================================================
         TITRE FACTURE + INFOS ENTREPRISE à droite
         =================================================== */
      const yAfterHeader = 115;

      /* Colonne gauche : FACTURE + ref + date */
      doc.font('Helvetica-Bold')
        .fontSize(20)
        .fillColor(gold)
        .text('FACTURE', 50, yAfterHeader);

      doc.font('Helvetica')
        .fontSize(10)
        .fillColor(grayText);

      doc.text(`Ref : ${order.ref}`, 50, yAfterHeader + 26);

      const orderDate = order.createdAt
        ? new Date(order.createdAt).toLocaleDateString('fr-FR', {
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })
        : new Date().toLocaleDateString('fr-FR');
      doc.text(`Date : ${orderDate}`, 50, yAfterHeader + 40);

      /* Moyen de paiement */
      const payMethod = order.paymentMethod || 'PayTech';
      doc.text(`Paiement : ${payMethod}`, 50, yAfterHeader + 54);

      /* Colonne droite : Infos entreprise */
      doc.font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(gold)
        .text('VENDEUR', 350, yAfterHeader, { align: 'right' });

      doc.font('Helvetica')
        .fontSize(9)
        .fillColor(darkText);
      doc.text(co.companyName, 350, yAfterHeader + 14, { align: 'right' });
      doc.text(co.companyEmail, 350, yAfterHeader + 27, { align: 'right' });
      doc.text(co.companyPhone, 350, yAfterHeader + 40, { align: 'right' });
      doc.text(co.companyAddress, 350, yAfterHeader + 53, { align: 'right' });

      /* Statut de paiement */
      const statusText = order.status === 'paid' ? 'PAYEE' : 
                         order.status === 'delivered' ? 'LIVREE' :
                         order.status === 'shipped' ? 'EXPEDIEE' :
                         order.status === 'pending' ? 'EN ATTENTE' : 'ANNULEE';
      const statusColor = order.status === 'paid' || order.status === 'delivered' || order.status === 'shipped'
        ? '#2e7d32' : order.status === 'pending' ? '#f57c00' : '#d32f2f';

      /* ===================================================
         INFORMATIONS CLIENT
         =================================================== */
      let yClient = yAfterHeader + 80;

      /* Fond gris clair pour la section client */
      doc.rect(50, yClient - 5, doc.page.width - 100, 80)
        .fill(lightBg);

      doc.font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(gold)
        .text('CLIENT', 60, yClient + 5);

      doc.font('Helvetica')
        .fontSize(10)
        .fillColor(darkText);

      doc.text(`${order.firstName} ${order.lastName}`, 60, yClient + 22);
      doc.text(`Tel : ${order.phone}`, 60, yClient + 37);
      doc.text(`Email : ${order.email}`, 60, yClient + 52);
      doc.text(`Livraison : ${order.address}`, 300, yClient + 22, { width: 210 });

      /* ===================================================
         TABLEAU DES ARTICLES
         =================================================== */
      let yTable = yClient + 100;

      /* En-tête du tableau */
      doc.rect(50, yTable, doc.page.width - 100, 25)
        .fill(gold);

      const colArticle = 60;
      const colQty = 330;
      const colUnit = 400;
      const colTotal = 480;

      doc.font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#ffffff');

      doc.text('ARTICLE', colArticle, yTable + 8);
      doc.text('QTE', colQty, yTable + 8, { width: 50, align: 'center' });
      doc.text('PRIX UNIT.', colUnit, yTable + 8, { width: 70, align: 'right' });
      doc.text('TOTAL', colTotal, yTable + 8, { width: 60, align: 'right' });

      /* Lignes des articles */
      yTable += 25;
      doc.font('Helvetica').fontSize(10).fillColor(darkText);

      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: OrderItem, index: number) => {
          if (index % 2 === 0) {
            doc.rect(50, yTable, doc.page.width - 100, 25).fill('#fdfbf7');
          }

          const unitPrice = item.unitPrice || 0;
          const lineTotal = unitPrice * item.quantity;

          doc.fillColor(darkText);
          doc.text(item.name, colArticle, yTable + 7, { width: 260 });
          doc.text(String(item.quantity), colQty, yTable + 7, { width: 50, align: 'center' });
          doc.text(`${formatPrice(unitPrice)} F`, colUnit, yTable + 7, { width: 70, align: 'right' });
          doc.font('Helvetica-Bold')
            .text(`${formatPrice(lineTotal)} F`, colTotal, yTable + 7, { width: 60, align: 'right' });
          doc.font('Helvetica');

          yTable += 25;
        });
      }

      /* Ligne de séparation */
      doc.moveTo(50, yTable).lineTo(doc.page.width - 50, yTable).strokeColor(borderColor).stroke();

      /* ===================================================
         MOYEN DE PAIEMENT + TOTAL
         =================================================== */
      yTable += 15;

      /* Moyen de paiement à gauche */
      doc.font('Helvetica')
        .fontSize(10)
        .fillColor(grayText)
        .text(`Moyen de paiement : ${payMethod}`, 60, yTable + 5);

      /* Fond doré pour le total à droite */
      doc.rect(350, yTable - 5, doc.page.width - 400, 35)
        .fill(lightBg);

      doc.font('Helvetica-Bold')
        .fontSize(14)
        .fillColor(gold)
        .text(`TOTAL : ${formatPrice(order.totalAmount)} FCFA`, 360, yTable + 3, {
          width: doc.page.width - 420,
          align: 'right',
        });

      /* ===================================================
         STATUT DE PAIEMENT
         =================================================== */
      yTable += 50;

      if (order.status === 'paid' || order.status === 'delivered' || order.status === 'shipped') {
        doc.rect(50, yTable, doc.page.width - 100, 30)
          .fill('#e8f5e9');
        doc.font('Helvetica-Bold')
          .fontSize(11)
          .fillColor('#2e7d32')
          .text(`Paiement confirme via ${payMethod}`, 0, yTable + 9, { align: 'center' });
      } else if (order.status === 'pending') {
        doc.rect(50, yTable, doc.page.width - 100, 30)
          .fill('#fff3e0');
        doc.font('Helvetica-Bold')
          .fontSize(11)
          .fillColor('#f57c00')
          .text('En attente de paiement', 0, yTable + 9, { align: 'center' });
      }

      /* ===================================================
         PIED DE PAGE : Coordonnées entreprise
         =================================================== */
      const yFooter = doc.page.height - 90;

      doc.moveTo(50, yFooter).lineTo(doc.page.width - 50, yFooter).strokeColor(borderColor).stroke();

      doc.font('Helvetica')
        .fontSize(8)
        .fillColor(grayText)
        .text(`${co.companyName} | ${co.companyEmail} | ${co.companyPhone}`, 0, yFooter + 10, { align: 'center' })
        .text(`${co.companyAddress} | ${co.companyWebsite}`, 0, yFooter + 23, { align: 'center' })
        .text('Merci pour votre confiance !', 0, yFooter + 40, { align: 'center' });

      /* --- Finaliser le PDF --- */
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
