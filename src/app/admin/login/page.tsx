/**
 * ============================================
 * FEEL ME - Page Login Admin
 * Formulaire de connexion administrateur
 * Authentification par email/password → JWT
 * ============================================
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, Eye, EyeOff } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Soumet le formulaire de login
   * Envoie les identifiants à l'API, stocke le token JWT en localStorage
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success && data.token) {
        /* --- Stocker le token et rediriger vers le dashboard --- */
        localStorage.setItem('feelme_admin_token', data.token);
        router.push('/admin');
      } else {
        setError(data.error || 'Identifiants incorrects');
      }
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fffdf9] via-white to-[#f9f3e8] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* --- Logo --- */}
        <div className="text-center mb-8">
          <h1 className="font-[var(--font-playfair)] text-4xl font-bold italic text-[#c9a84c] mb-2">
            Feel Me
          </h1>
          <p className="text-gray-400 text-sm uppercase tracking-widest">
            Administration
          </p>
        </div>

        {/* --- Formulaire de login --- */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-[#f0e6d3] p-8 shadow-lg shadow-[#c9a84c]/5"
        >
          <h2 className="font-semibold text-gray-800 text-lg mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#c9a84c]" />
            Connexion
          </h2>

          {/* Erreur */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-200 mb-4">
              {error}
            </div>
          )}

          {/* Email */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@email.com"
                required
                className="w-full pl-10 pr-4 py-3 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30 focus:border-[#c9a84c] transition-all"
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-12 py-3 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30 focus:border-[#c9a84c] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Bouton connexion */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#c9a84c] to-[#e8d48b] text-white font-semibold py-3.5 px-6 rounded-xl hover:from-[#a88a2e] hover:to-[#c9a84c] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connexion...
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        {/* --- Lien retour site --- */}
        <div className="text-center mt-6">
          <a href="/" className="text-sm text-gray-400 hover:text-[#c9a84c] transition-colors">
            ← Retour au site
          </a>
        </div>
      </div>
    </div>
  );
}
