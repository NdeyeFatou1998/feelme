# 💳 Flux de Paiement Feel Me - PayTech

## 🔄 Nouveau flux corrigé (Sécurisé)

### 1️⃣ **Client passe commande** (`/checkout`)
- Remplit le formulaire : prénom, nom, téléphone, email, adresse
- Clique sur "Passer commande"
- ❌ **Aucune commande n'est créée en base de données**

### 2️⃣ **Initiation du paiement** (`POST /api/orders`)
- Génère une référence unique (ex: `FM-20240317-A1B2`)
- Stocke les données de commande dans `custom_field` de PayTech
- Appelle l'API PayTech pour créer une session de paiement
- Retourne l'URL de redirection PayTech

### 3️⃣ **Redirection vers PayTech**
- Le client est redirigé vers la page de paiement PayTech
- Il choisit son mode de paiement (Orange Money, Wave, etc.)
- Il effectue le paiement

### 4️⃣ **Confirmation de paiement** (IPN - `POST /api/payment/ipn`)
- PayTech envoie une notification IPN à notre serveur
- Vérification de l'authenticité (SHA256)
- **Si paiement réussi (`sale_complete`)** :
  - ✅ **Création de la commande en base de données** avec `status: 'paid'`
  - ✅ **Envoi automatique d'email au client** avec facture HTML
  - ✅ **Envoi automatique d'email à l'admin** avec détails de la commande
  - ✅ Stockage du token PayTech et de la méthode de paiement
- **Si paiement annulé (`sale_canceled`)** :
  - ❌ Aucune commande n'est créée
  - Le client est redirigé vers `/commande/annulee`

### 5️⃣ **Redirection finale**
- **Succès** : `/commande/succes?ref=FM-20240317-A1B2`
  - Affiche la confirmation avec référence de commande
  - Récupère les détails via `GET /api/orders/[ref]`
- **Annulation** : `/commande/annulee?ref=FM-20240317-A1B2`
  - Affiche un message d'annulation
  - Propose de réessayer

---

## 📧 Emails automatiques

### Email client (Confirmation + Facture)
```
De: Feel Me <softechiris@gmail.com>
À: client@example.com
Sujet: ✨ Feel Me - Confirmation de commande FM-20240317-A1B2

Bonjour [Prénom],

Merci pour votre commande ! Voici votre facture :

┌─────────────────────────────────────────┐
│ FACTURE - Commande FM-20240317-A1B2     │
├─────────────────────────────────────────┤
│ Client : [Nom complet]                  │
│ Téléphone : [Téléphone]                 │
│ Email : [Email]                         │
│ Adresse : [Adresse de livraison]        │
├─────────────────────────────────────────┤
│ Articles :                              │
│ - Musc Al Haramain 3ml x2 = 6000 FCFA  │
│ - Pack 3x3ml x1 = 15000 FCFA           │
├─────────────────────────────────────────┤
│ TOTAL : 21 000 FCFA                     │
│ ✅ Paiement confirmé                    │
└─────────────────────────────────────────┘

Nous vous contacterons très bientôt pour la livraison.

L'équipe Feel Me 🌸
```

### Email admin (Notification)
```
De: Feel Me <softechiris@gmail.com>
À: softechiris@gmail.com
Sujet: 🛒 Nouvelle commande FM-20240317-A1B2 - 21 000 FCFA

🛒 Nouvelle commande reçue !

[Nom complet] vient de passer une commande.

[Même facture que le client]

Connectez-vous au Dashboard Admin pour gérer cette commande.
```

---

## 🔐 Sécurité

### Vérification IPN
- **SHA256** : Vérification de l'authenticité de la notification PayTech
- **Idempotence** : Vérification qu'une commande n'est pas créée deux fois
- **Custom field** : Stockage sécurisé des données de commande

### Variables d'environnement requises
```env
PAYTECH_API_KEY=votre_api_key
PAYTECH_API_SECRET=votre_api_secret
PAYTECH_ENV=test  # ou 'prod'
SMTP_USER=votre_email@gmail.com
SMTP_PASS=votre_mot_de_passe_application
```

---

## ✅ Avantages du nouveau flux

1. ✅ **Aucune commande fantôme** : Les commandes ne sont créées qu'après paiement confirmé
2. ✅ **Traçabilité complète** : Token PayTech et méthode de paiement stockés
3. ✅ **Emails automatiques** : Client et admin reçoivent la facture immédiatement
4. ✅ **Sécurisé** : Vérification SHA256 des notifications PayTech
5. ✅ **Idempotent** : Pas de duplication de commande même si IPN est appelé plusieurs fois
6. ✅ **Référence unique** : Format `FM-YYYYMMDD-XXXX` pour chaque commande

---

## 🧪 Tests

### Mode Test PayTech
1. Configurez `PAYTECH_ENV=test` dans `.env`
2. Utilisez les clés API de test fournies par PayTech
3. Les paiements test ne débitent pas de vrais comptes

### Vérifier les emails
1. Configurez un compte Gmail avec mot de passe d'application
2. Testez une commande complète
3. Vérifiez que les emails arrivent bien au client et à l'admin

### Tester l'IPN
1. PayTech envoie automatiquement l'IPN après paiement
2. Vérifiez les logs serveur : `[IPN] Notification reçue`
3. Vérifiez que la commande est créée avec `status: 'paid'`

---

## 📊 Statuts de commande

- `paid` : Paiement confirmé, commande créée
- `shipped` : Commande expédiée (à gérer manuellement dans l'admin)
- `delivered` : Commande livrée (à gérer manuellement dans l'admin)
- `cancelled` : Commande annulée

**Note** : Le statut `pending` n'est plus utilisé car les commandes ne sont créées qu'après paiement.
