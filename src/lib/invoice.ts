/**
 * ============================================
 * FEEL ME - Génération de factures PDF
 * Utilise PDFKit pour créer des factures
 * professionnelles avec :
 *   - En-tête doré Feel Me
 *   - Infos client et livraison
 *   - Tableau des articles
 *   - Total et statut de paiement
 *   - Pied de page avec remerciements
 * 
 * Retourne un Buffer PDF prêt à être :
 *   - Joint en pièce jointe email (Nodemailer)
 *   - Téléchargé via une route API
 * ============================================
 */

import PDFDocument from 'pdfkit';
import { OrderAttributes, OrderItem } from './models/Order';

/**
 * Génère un Buffer PDF contenant la facture d'une commande.
 * @param order - Les données complètes de la commande
 * @returns Promise<Buffer> - Le PDF sous forme de Buffer
 */
export async function generateInvoicePDF(order: OrderAttributes): Promise<Buffer> {
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
         EN-TÊTE : Bandeau doré + nom Feel Me + sous-titre
         =================================================== */
      doc.rect(0, 0, doc.page.width, 100).fill(gold);
      
      /* Titre "Feel Me" centré en blanc */
      doc.font('Helvetica-Bold')
        .fontSize(32)
        .fillColor('#ffffff')
        .text('Feel Me', 0, 25, { align: 'center' });

      /* Sous-titre */
      doc.font('Helvetica')
        .fontSize(10)
        .fillColor('#ffffff')
        .text('LES SENTEURS DU PARADIS', 0, 62, { align: 'center', characterSpacing: 3 });

      /* ===================================================
         TITRE FACTURE + RÉFÉRENCE
         =================================================== */
      doc.moveDown(2);
      const yAfterHeader = 120;

      doc.font('Helvetica-Bold')
        .fontSize(20)
        .fillColor(gold)
        .text(`FACTURE`, 50, yAfterHeader);

      doc.font('Helvetica')
        .fontSize(11)
        .fillColor(grayText)
        .text(`Référence : ${order.ref}`, 50, yAfterHeader + 28);

      /* Date de la commande */
      const orderDate = order.createdAt
        ? new Date(order.createdAt).toLocaleDateString('fr-FR', {
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })
        : new Date().toLocaleDateString('fr-FR');
      
      doc.text(`Date : ${orderDate}`, 50, yAfterHeader + 44);

      /* Statut de paiement à droite */
      const statusText = order.status === 'paid' ? 'PAYÉE' : 
                         order.status === 'delivered' ? 'LIVRÉE' :
                         order.status === 'shipped' ? 'EXPÉDIÉE' :
                         order.status === 'pending' ? 'EN ATTENTE' : 'ANNULÉE';
      const statusColor = order.status === 'paid' || order.status === 'delivered' || order.status === 'shipped'
        ? '#2e7d32' : order.status === 'pending' ? '#f57c00' : '#d32f2f';

      doc.font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(statusColor)
        .text(statusText, 350, yAfterHeader, { align: 'right' });

      /* ===================================================
         INFORMATIONS CLIENT
         =================================================== */
      let yClient = yAfterHeader + 75;

      /* Fond gris clair pour la section client */
      doc.rect(50, yClient - 5, doc.page.width - 100, 80)
        .fill(lightBg);

      doc.font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(gold)
        .text('INFORMATIONS CLIENT', 60, yClient + 5);

      doc.font('Helvetica')
        .fontSize(10)
        .fillColor(darkText);

      doc.text(`Nom : ${order.firstName} ${order.lastName}`, 60, yClient + 22);
      doc.text(`Téléphone : ${order.phone}`, 60, yClient + 37);
      doc.text(`Email : ${order.email}`, 300, yClient + 22);
      doc.text(`Adresse : ${order.address}`, 300, yClient + 37, { width: 200 });

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
      doc.text('QTÉ', colQty, yTable + 8, { width: 50, align: 'center' });
      doc.text('PRIX UNIT.', colUnit, yTable + 8, { width: 70, align: 'right' });
      doc.text('TOTAL', colTotal, yTable + 8, { width: 60, align: 'right' });

      /* Lignes des articles */
      yTable += 25;
      doc.font('Helvetica').fontSize(10).fillColor(darkText);

      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: OrderItem, index: number) => {
          /* Alternance de fond pour lisibilité */
          if (index % 2 === 0) {
            doc.rect(50, yTable, doc.page.width - 100, 25).fill('#fdfbf7');
          }

          const unitPrice = item.unitPrice || 0;
          const lineTotal = unitPrice * item.quantity;

          doc.fillColor(darkText);
          doc.text(item.name, colArticle, yTable + 7, { width: 260 });
          doc.text(String(item.quantity), colQty, yTable + 7, { width: 50, align: 'center' });
          doc.text(`${unitPrice.toLocaleString('fr-FR')} F`, colUnit, yTable + 7, { width: 70, align: 'right' });
          doc.font('Helvetica-Bold')
            .text(`${lineTotal.toLocaleString('fr-FR')} F`, colTotal, yTable + 7, { width: 60, align: 'right' });
          doc.font('Helvetica');

          yTable += 25;
        });
      }

      /* Ligne de séparation */
      doc.moveTo(50, yTable).lineTo(doc.page.width - 50, yTable).strokeColor(borderColor).stroke();

      /* ===================================================
         TOTAL
         =================================================== */
      yTable += 15;

      /* Fond doré pour le total */
      doc.rect(350, yTable - 5, doc.page.width - 400, 35)
        .fill(lightBg);

      doc.font('Helvetica-Bold')
        .fontSize(14)
        .fillColor(gold)
        .text(`TOTAL : ${order.totalAmount.toLocaleString('fr-FR')} FCFA`, 360, yTable + 3, {
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
          .text('✓ Paiement confirmé', 0, yTable + 9, { align: 'center' });
      } else if (order.status === 'pending') {
        doc.rect(50, yTable, doc.page.width - 100, 30)
          .fill('#fff3e0');

        doc.font('Helvetica-Bold')
          .fontSize(11)
          .fillColor('#f57c00')
          .text('⏳ En attente de paiement', 0, yTable + 9, { align: 'center' });
      }

      /* ===================================================
         PIED DE PAGE
         =================================================== */
      const yFooter = doc.page.height - 80;

      doc.moveTo(50, yFooter).lineTo(doc.page.width - 50, yFooter).strokeColor(borderColor).stroke();

      doc.font('Helvetica')
        .fontSize(9)
        .fillColor(grayText)
        .text('Feel Me — Les senteurs du paradis', 0, yFooter + 10, { align: 'center' })
        .text('Merci pour votre confiance ❤️', 0, yFooter + 25, { align: 'center' })
        .text('www.feel-me.store', 0, yFooter + 40, { align: 'center' });

      /* --- Finaliser le PDF --- */
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
