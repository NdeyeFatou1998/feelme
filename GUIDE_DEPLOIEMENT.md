# 🚀 Guide de Déploiement - Feel Me sur Vercel

## 📋 Étape 1 : Préparation

### ✅ Vérifications avant déploiement

Votre projet est prêt avec :
- ✅ Code committé sur Git
- ✅ `.gitignore` configuré (fichiers `.env` exclus)
- ✅ Documentation complète
- ✅ Intégration PayTech fonctionnelle
- ✅ Système d'emails configuré

---

## 🌐 Étape 2 : Créer un compte Vercel

1. Allez sur **https://vercel.com**
2. Cliquez sur **"Sign Up"**
3. Connectez-vous avec votre compte **GitHub**
4. Autorisez Vercel à accéder à vos repos GitHub

---

## 📦 Étape 3 : Déployer le projet

### Option A : Depuis le dashboard Vercel (Recommandé)

1. **Cliquez sur "Add New"** → **"Project"**

2. **Importez votre repo** :
   - Vercel va créer automatiquement un repo GitHub pour vous
   - Sélectionnez le dossier `/Users/password/Desktop/feelme/feelme-app`
   - Donnez un nom au repo : `feelme-ecommerce`

3. **Configurez le projet** :
   - Framework Preset : **Next.js** (détecté automatiquement)
   - Root Directory : `./` (racine du projet)
   - Build Command : `npm run build` (par défaut)
   - Output Directory : `.next` (par défaut)

4. **Configurez les variables d'environnement** :

   Cliquez sur **"Environment Variables"** et ajoutez :

   ```env
   # Base de données (Vercel Postgres ou externe)
   DATABASE_URL=postgresql://user:password@host:5432/feelme
   
   # JWT Secret
   JWT_SECRET=feelme_super_secret_jwt_key_2024_paradise_scents
   
   # PayTech
   PAYTECH_API_KEY=ef008c29064a766a886da0947845e25244a646c3ef2deb51761e6856d6ced961
   PAYTECH_API_SECRET=b743f8fccd85bbd6ace4414263d131151b5fa20a985e1768d083f82aa71b8709
   PAYTECH_ENV=test
   
   # SMTP Gmail
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=softechiris@gmail.com
   SMTP_PASS=cfrdgeuvivcxweio
   SMTP_FROM=Feel Me <softechiris@gmail.com>
   
   # App URL (à mettre à jour après déploiement)
   APP_URL=https://feelme-ecommerce.vercel.app
   ```

5. **Cliquez sur "Deploy"** 🚀

---

## 🗄️ Étape 4 : Configurer la base de données

### Option A : Vercel Postgres (Recommandé)

1. Dans votre projet Vercel, allez dans **"Storage"**
2. Cliquez sur **"Create Database"** → **"Postgres"**
3. Donnez un nom : `feelme-db`
4. Région : Choisissez la plus proche (ex: Frankfurt pour l'Europe)
5. Cliquez sur **"Create"**
6. Vercel va automatiquement ajouter `DATABASE_URL` à vos variables d'environnement

### Option B : Base de données externe

Si vous utilisez une base PostgreSQL externe :
- Assurez-vous qu'elle est accessible depuis internet
- Mettez à jour `DATABASE_URL` dans les variables d'environnement

---

## 🔧 Étape 5 : Configuration post-déploiement

### 1. Mettre à jour APP_URL

Après le premier déploiement :
1. Notez l'URL de votre app (ex: `https://feelme-ecommerce.vercel.app`)
2. Allez dans **Settings** → **Environment Variables**
3. Modifiez `APP_URL` avec votre URL Vercel
4. **Redéployez** : Deployments → ... → Redeploy

### 2. Configurer PayTech IPN

1. Connectez-vous à votre dashboard PayTech : **https://paytech.sn**
2. Allez dans **Paramètres** → **API**
3. Configurez l'URL IPN :
   ```
   https://feelme-ecommerce.vercel.app/api/payment/ipn
   ```
4. Sauvegardez

### 3. Tester le paiement

1. Allez sur votre site : `https://feelme-ecommerce.vercel.app`
2. Ajoutez des produits au panier
3. Passez une commande test
4. Vérifiez la redirection vers PayTech
5. Effectuez un paiement test
6. Vérifiez que :
   - La commande est créée en base
   - Les emails sont envoyés
   - La page de succès s'affiche

---

## 🔐 Étape 6 : Sécurité en production

### 1. Changer le mot de passe admin

1. Connectez-vous à `/admin/login`
2. Email : `admin@feelme.com`
3. Mot de passe : `admin123`
4. Changez immédiatement le mot de passe dans la base de données

### 2. Passer PayTech en mode production

Quand vous êtes prêt pour la production :
1. Récupérez vos clés API de **production** sur PayTech
2. Mettez à jour les variables d'environnement :
   ```env
   PAYTECH_API_KEY=votre_cle_production
   PAYTECH_API_SECRET=votre_secret_production
   PAYTECH_ENV=prod
   ```
3. Redéployez

### 3. Configurer un domaine personnalisé (Optionnel)

1. Dans Vercel, allez dans **Settings** → **Domains**
2. Ajoutez votre domaine (ex: `feelme.sn`)
3. Suivez les instructions pour configurer les DNS
4. Mettez à jour `APP_URL` avec votre nouveau domaine
5. Mettez à jour l'URL IPN dans PayTech

---

## 📊 Étape 7 : Monitoring

### Logs Vercel

- Allez dans **Deployments** → Cliquez sur un déploiement
- Consultez les **Runtime Logs** pour voir les logs serveur
- Vérifiez les erreurs éventuelles

### Logs PayTech

- Consultez votre dashboard PayTech pour voir les transactions
- Vérifiez que les IPN sont bien reçus

### Emails

- Vérifiez que les emails de confirmation arrivent bien
- Testez avec plusieurs adresses email

---

## 🆘 Dépannage

### Erreur de connexion à la base de données

```
Error: connect ECONNREFUSED
```

**Solution** :
- Vérifiez que `DATABASE_URL` est correctement configuré
- Assurez-vous que la base de données accepte les connexions externes
- Pour Vercel Postgres, vérifiez que la base est bien créée

### Erreur PayTech

```
Service de paiement temporairement indisponible
```

**Solution** :
- Vérifiez vos clés API PayTech
- Vérifiez que `PAYTECH_ENV` est bien défini
- Consultez les logs Vercel pour plus de détails

### Emails non reçus

**Solution** :
- Vérifiez que le mot de passe d'application Gmail est correct
- Vérifiez les paramètres SMTP
- Consultez les logs Vercel pour voir les erreurs d'envoi

### Erreur 500 sur les routes API

**Solution** :
- Consultez les Runtime Logs dans Vercel
- Vérifiez que toutes les variables d'environnement sont définies
- Vérifiez que la base de données est accessible

---

## ✅ Checklist finale

Avant de mettre en production :

- [ ] Base de données configurée et accessible
- [ ] Toutes les variables d'environnement définies
- [ ] APP_URL mis à jour avec l'URL Vercel
- [ ] URL IPN configurée dans PayTech
- [ ] Paiement test effectué avec succès
- [ ] Emails de confirmation reçus
- [ ] Mot de passe admin changé
- [ ] Dashboard admin accessible et fonctionnel
- [ ] Images uploadées correctement
- [ ] Domaine personnalisé configuré (si applicable)

---

## 🎉 Félicitations !

Votre boutique Feel Me est maintenant en ligne ! 🌸

**URL de votre site** : https://feelme-ecommerce.vercel.app
**Dashboard admin** : https://feelme-ecommerce.vercel.app/admin/login

---

## 📞 Support

Pour toute question :
- Documentation PayTech : https://docs.intech.sn/doc_paytech.php
- Documentation Vercel : https://vercel.com/docs
- Documentation Next.js : https://nextjs.org/docs
