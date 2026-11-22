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

/** Comparaison en temps constant de deux empreintes hexadécimales. */
function sameHex(expected: string, received: unknown): boolean {
  if (typeof received !== 'string' || !/^[0-9a-f]+$/i.test(received)) return false;
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(received.toLowerCase(), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

type Keys = { apiKey: string; apiSecret: string };

/** HMAC-SHA256 de « item_price|ref_command|api_key » avec la clé secrète (méthode recommandée par PayTech). */
export function verifyIPNHmac(body: Record<string, unknown>, keys: Keys): boolean {
  const message = `${body.item_price}|${body.ref_command}|${keys.apiKey}`;
  const expected = crypto.createHmac('sha256', keys.apiSecret).update(message).digest('hex');
  return sameHex(expected, body.hmac_compute);
}

/** SHA256 des deux clés API (méthode classique de PayTech). */
export function verifyIPNSha256(body: Record<string, unknown>, keys: Keys): boolean {
  const sha = (v: string) => crypto.createHash('sha256').update(v).digest('hex');
  return sameHex(sha(keys.apiKey), body.api_key_sha256) && sameHex(sha(keys.apiSecret), body.api_secret_sha256);
}

/**
 * Vrai seulement si la notification vient de PayTech : le HMAC quand PayTech l'envoie,
 * sinon les empreintes SHA256 des clés. Sans clés configurées, rien n'est authentique.
 */
export function isAuthenticIpn(
  body: Record<string, unknown>,
  keys: Keys = { apiKey: process.env.PAYTECH_API_KEY || '', apiSecret: process.env.PAYTECH_API_SECRET || '' }
): { ok: boolean; how: string } {
  if (!keys.apiKey || !keys.apiSecret) return { ok: false, how: 'clés PayTech absentes du serveur' };
  if (body.hmac_compute !== undefined && body.hmac_compute !== null && body.hmac_compute !== '') {
    return verifyIPNHmac(body, keys) ? { ok: true, how: 'HMAC' } : { ok: false, how: 'HMAC invalide' };
  }
  if (body.api_key_sha256 || body.api_secret_sha256) {
    return verifyIPNSha256(body, keys) ? { ok: true, how: 'SHA256' } : { ok: false, how: 'SHA256 invalide' };
  }
  return { ok: false, how: 'aucune signature' };
}
