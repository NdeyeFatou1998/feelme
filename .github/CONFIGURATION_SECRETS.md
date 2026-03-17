# 🔐 Configuration des Secrets GitHub pour CI/CD

Pour que le pipeline CI/CD fonctionne, vous devez configurer les secrets suivants dans votre repo GitHub.

## 📋 Secrets à configurer

### 1. Allez dans les paramètres GitHub

1. Ouvrez votre repo : https://github.com/NdeyeFatou1998/feelme
2. Cliquez sur **"Settings"** (en haut)
3. Dans le menu de gauche : **"Secrets and variables"** → **"Actions"**
4. Cliquez sur **"New repository secret"**

---

## 🔑 Liste des secrets à ajouter

### Secrets Vercel (pour le déploiement automatique)

#### VERCEL_TOKEN
```
Comment l'obtenir :
1. Allez sur https://vercel.com/account/tokens
2. Cliquez sur "Create Token"
3. Nom : "GitHub Actions CI/CD"
4. Scope : "Full Account"
5. Copiez le token généré

Name: VERCEL_TOKEN
Value: [votre_token_vercel]
```

#### VERCEL_ORG_ID
```
Comment l'obtenir :
1. Allez dans votre projet Vercel
2. Settings → General
3. Cherchez "Project ID" et "Team ID"
4. Copiez le Team ID (ou Organization ID)

Name: VERCEL_ORG_ID
Value: [votre_org_id]
```

#### VERCEL_PROJECT_ID
```
Comment l'obtenir :
1. Dans votre projet Vercel
2. Settings → General
3. Cherchez "Project ID"
4. Copiez le Project ID

Name: VERCEL_PROJECT_ID
Value: [votre_project_id]
```

---

### Secrets Application (pour le build)

#### JWT_SECRET
```
Name: JWT_SECRET
Value: feelme_super_secret_jwt_key_2024_paradise_scents
```

#### PAYTECH_API_KEY
```
Name: PAYTECH_API_KEY
Value: ef008c29064a766a886da0947845e25244a646c3ef2deb51761e6856d6ced961
```

#### PAYTECH_API_SECRET
```
Name: PAYTECH_API_SECRET
Value: b743f8fccd85bbd6ace4414263d131151b5fa20a985e1768d083f82aa71b8709
```

#### SMTP_USER
```
Name: SMTP_USER
Value: softechiris@gmail.com
```

#### SMTP_PASS
```
Name: SMTP_PASS
Value: cfrdgeuvivcxweio
```

#### SMTP_FROM
```
Name: SMTP_FROM
Value: Feel Me <softechiris@gmail.com>
```

#### DATABASE_URL
```
Name: DATABASE_URL
Value: [votre_database_url_vercel]

Note: Récupérez cette valeur depuis Vercel après avoir créé la base Postgres
```

---

## ✅ Vérification

Une fois tous les secrets ajoutés, vous devriez avoir **10 secrets** :

1. ✅ VERCEL_TOKEN
2. ✅ VERCEL_ORG_ID
3. ✅ VERCEL_PROJECT_ID
4. ✅ JWT_SECRET
5. ✅ PAYTECH_API_KEY
6. ✅ PAYTECH_API_SECRET
7. ✅ SMTP_USER
8. ✅ SMTP_PASS
9. ✅ SMTP_FROM
10. ✅ DATABASE_URL

---

## 🚀 Comment fonctionne le pipeline

### Déclenchement automatique

Le pipeline se déclenche automatiquement quand :
- ✅ Vous poussez du code sur la branche `main`
- ✅ Vous poussez du code sur la branche `develop`
- ✅ Vous créez une Pull Request vers `main`

### Étapes du pipeline

1. **Lint & Type Check** : Vérification du code TypeScript
2. **Build** : Compilation de l'application Next.js
3. **Deploy** : Déploiement automatique sur Vercel (branche `main` uniquement)
4. **Notify** : Notification de succès

### Preview Deployments

Pour les Pull Requests :
- Un déploiement de preview est créé automatiquement
- Un commentaire est ajouté à la PR avec le lien de preview
- Vous pouvez tester les changements avant de merger

---

## 🔧 Commandes utiles

### Tester le pipeline localement
```bash
# Lint
npm run lint

# Type check
npx tsc --noEmit

# Build
npm run build
```

### Forcer un redéploiement
```bash
git commit --allow-empty -m "chore: trigger deployment"
git push origin main
```

---

## 📊 Voir les résultats du pipeline

1. Allez sur votre repo GitHub
2. Cliquez sur l'onglet **"Actions"**
3. Vous verrez tous les workflows en cours et terminés
4. Cliquez sur un workflow pour voir les détails

---

## 🆘 Dépannage

### Le workflow échoue au build
- Vérifiez que tous les secrets sont bien configurés
- Vérifiez les logs dans l'onglet Actions

### Le déploiement Vercel échoue
- Vérifiez VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
- Assurez-vous que le token Vercel a les bonnes permissions

### Les secrets ne sont pas reconnus
- Les secrets doivent être en MAJUSCULES
- Pas d'espaces dans les noms de secrets
- Redémarrez le workflow après avoir ajouté les secrets

---

## 🎉 Avantages du CI/CD

✅ **Déploiement automatique** : Chaque push sur `main` déploie automatiquement
✅ **Tests automatiques** : Le code est vérifié avant déploiement
✅ **Preview deployments** : Testez les PR avant de merger
✅ **Historique** : Tous les déploiements sont tracés
✅ **Rollback facile** : Revenez à une version précédente en 1 clic

---

Votre pipeline CI/CD est maintenant configuré ! 🚀
