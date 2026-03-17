/**
 * ============================================
 * FEEL ME - Service PayTech (paiement)
 * Intégration de l'API PayTech pour les paiements
 * par redirection (Orange Money, Wave, etc.)
 * Documentation : https://docs.intech.sn/doc_paytech.php
 * ============================================
 */

import crypto from 'crypto';

/* --- URL de base de l'API PayTech --- */
const PAYTECH_API_URL = 'https://paytech.sn/api/payment/request-payment';

/**
 * Interface pour les paramètres de demande de paiement
 */
export interface PaymentRequestParams {
  itemName: string;        // Nom de l'article / commande
  itemPrice: number;       // Prix total en FCFA
  refCommand: string;      // Référence unique de la commande
  commandName: string;     // Description de la commande
  customerEmail: string;   // Email du client
  customerPhone: string;   // Téléphone du client
  customerName: string;    // Nom complet du client
  orderData?: any;         // Données de commande à passer dans custom_field
}

/**
 * Interface pour la réponse de PayTech
 */
export interface PaymentResponse {
  success: number;
  token?: string;
  redirect_url?: string;
  redirectUrl?: string;
  message?: string;
}

/**
 * Crée une demande de paiement auprès de PayTech
 * Retourne l'URL de redirection vers la page de paiement
 */
export async function createPaymentRequest(params: PaymentRequestParams): Promise<PaymentResponse> {
  /* --- URL de base : utiliser APP_URL, VERCEL_PROJECT_PRODUCTION_URL, ou fallback --- */
  const appUrl = process.env.APP_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
    || 'https://feel-me.store';

  console.log('[PAYTECH] APP_URL utilisée:', appUrl);
  
  /* --- Construction du body de la requête --- */
  /* IMPORTANT: item_price DOIT être un string pour PayTech */
  const body = {
    item_name: params.itemName,
    item_price: String(params.itemPrice),       // PayTech exige un string
    currency: 'XOF',                            // Franc CFA
    ref_command: params.refCommand,
    command_name: params.commandName,
    env: process.env.PAYTECH_ENV || 'test',     // 'test' ou 'prod'
    ipn_url: `${appUrl}/api/payment/ipn`,       // URL de notification IPN
    success_url: `${appUrl}/commande/succes?ref=${params.refCommand}`,
    cancel_url: `${appUrl}/commande/annulee?ref=${params.refCommand}`,
    custom_field: JSON.stringify(params.orderData || {
      ref: params.refCommand,
      email: params.customerEmail,
      phone: params.customerPhone,
    }),
  };

  console.log('[PAYTECH] Body envoyé:', JSON.stringify(body, null, 2));

  /* --- Headers avec clés API --- */
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'API_KEY': process.env.PAYTECH_API_KEY || '',
    'API_SECRET': process.env.PAYTECH_API_SECRET || '',
  };

  try {
    const response = await fetch(PAYTECH_API_URL, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });

    const data: PaymentResponse = await response.json();
    console.log('[PAYTECH] Réponse:', JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('[PAYTECH] Erreur:', error);
    return { success: 0, message: 'Erreur de connexion à PayTech' };
  }
}

/**
 * Vérifie l'authenticité d'une notification IPN PayTech
 * Méthode HMAC-SHA256 (recommandée)
 */
export function verifyIPNHmac(
  itemPrice: number,
  refCommand: string,
  receivedHmac: string
): boolean {
  const apiKey = process.env.PAYTECH_API_KEY || '';
  const apiSecret = process.env.PAYTECH_API_SECRET || '';
  
  const message = `${itemPrice}|${refCommand}|${apiKey}`;
  const hmac = crypto.createHmac('sha256', apiSecret);
  hmac.update(message);
  const expectedHmac = hmac.digest('hex');
  
  return expectedHmac === receivedHmac;
}

/**
 * Vérifie l'authenticité via SHA256 (méthode classique)
 */
export function verifyIPNSha256(
  receivedKeyHash: string,
  receivedSecretHash: string
): boolean {
  const apiKey = process.env.PAYTECH_API_KEY || '';
  const apiSecret = process.env.PAYTECH_API_SECRET || '';
  
  const expectedKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const expectedSecretHash = crypto.createHash('sha256').update(apiSecret).digest('hex');
  
  return expectedKeyHash === receivedKeyHash && expectedSecretHash === receivedSecretHash;
}
