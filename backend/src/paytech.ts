/**
 * ============================================
 * FEEL ME - Service PayTech (paiement)
 * Intégration de l'API PayTech pour les paiements
 * par redirection (Orange Money, Wave, etc.)
 * Documentation : https://docs.intech.sn/doc_paytech.php
 * ============================================
 */

import crypto from 'crypto';

const PAYTECH_API_URL = 'https://paytech.sn/api/payment/request-payment';

export interface PaymentRequestParams {
  itemName: string;
  itemPrice: number;
  refCommand: string;
  commandName: string;
  customerEmail: string;
  customerPhone: string;
  customerName: string;
  orderData?: any;
}

export interface PaymentResponse {
  success: number;
  token?: string;
  redirect_url?: string;
  redirectUrl?: string;
  message?: string;
}

export async function createPaymentRequest(params: PaymentRequestParams): Promise<PaymentResponse> {
  const apiUrl = process.env.API_URL || process.env.APP_URL || 'http://localhost:4000';
  const frontUrl = process.env.FRONT_URL || 'http://localhost:3000';

  console.log('[PAYTECH] API_URL (IPN):', apiUrl);
  console.log('[PAYTECH] FRONT_URL (success/cancel):', frontUrl);

  const body = {
    item_name: params.itemName,
    item_price: String(params.itemPrice),
    currency: 'XOF',
    ref_command: params.refCommand,
    command_name: params.commandName,
    env: process.env.PAYTECH_ENV || 'test',
    ipn_url: `${apiUrl}/api/payment/ipn`,
    success_url: `${frontUrl}/commande/succes?ref=${params.refCommand}`,
    cancel_url: `${frontUrl}/commande/annulee?ref=${params.refCommand}`,
    custom_field: JSON.stringify(
      params.orderData || {
        ref: params.refCommand,
        email: params.customerEmail,
        phone: params.customerPhone,
      }
    ),
  };

  console.log('[PAYTECH] Body envoyé:', JSON.stringify(body, null, 2));

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    API_KEY: process.env.PAYTECH_API_KEY || '',
    API_SECRET: process.env.PAYTECH_API_SECRET || '',
  };

  try {
    const response = await fetch(PAYTECH_API_URL, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });

    const data = (await response.json()) as PaymentResponse;
    console.log('[PAYTECH] Réponse:', JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('[PAYTECH] Erreur:', error);
    return { success: 0, message: 'Erreur de connexion à PayTech' };
  }
}

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
