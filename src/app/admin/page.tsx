/**
 * ============================================
 * FEEL ME - Dashboard Admin Principal
 * Interface d'administration complète :
 * - Gestion des produits (CRUD + prix promo)
 * - Gestion des catégories
 * - Gestion des packs configurables
 * - Gestion des commandes (statuts)
 * Navigation par onglets latéraux
 * ============================================
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package, Tag, Layers, ShoppingCart, LogOut, Plus, Trash2, Edit3,
  Save, X, Image as ImageIcon, Loader2, BarChart3, Eye, EyeOff,
  ChevronDown, ChevronUp, Menu, XIcon, Users, TrendingUp, FileDown, Settings as SettingsIcon
} from 'lucide-react';
import ResellerPacksTab from './reseller-packs-tab';

/* ===== INTERFACES ===== */
interface CategoryData {
  id: number; name: string; slug: string; description: string | null; image: string | null;
}
interface ProductData {
  id: number; name: string; slug: string; description: string | null;
  price: number; promoPrice: number | null; image: string | null;
  categoryId: number; volume: string | null; stock: number; isActive: boolean;
  category?: CategoryData;
}
interface PackItem { productId: number; productName?: string; quantity: number; }
interface PackData {
  id: number; name: string; slug: string; description: string | null;
  price: number; promoPrice: number | null; image: string | null;
  categoryId: number | null;
  items: PackItem[]; isActive: boolean;
}
interface OrderData {
  id: number; ref: string; firstName: string; lastName: string;
  phone: string; email: string; address: string;
  items: any[]; totalAmount: number;
  deposit: number; remaining: number;
  source: 'site' | 'manual'; notes: string | null;
  status: string; paymentMethod: string | null;
  createdAt: string;
  /* --- Alias colonnes snake_case depuis la DB --- */
  first_name?: string; last_name?: string; total_amount?: number;
  payment_method?: string;
}

/* ===== COMPOSANT PRINCIPAL ===== */
export default function AdminDashboard() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'categories' | 'packs' | 'reseller-packs' | 'orders' | 'settings'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* --- Données chargées depuis l'API --- */
  const [products, setProducts] = useState<ProductData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [packs, setPacks] = useState<PackData[]>([]);
  const [resellerPacks, setResellerPacks] = useState<any[]>([]);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);

  /* ===== VÉRIFICATION AUTHENTIFICATION ===== */
  useEffect(() => {
    const storedToken = localStorage.getItem('feelme_admin_token');
    if (!storedToken) {
      router.push('/admin/login');
      return;
    }
    setToken(storedToken);
  }, [router]);

  /* ===== CHARGEMENT DES DONNÉES ===== */
  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [prodRes, catRes, packRes, resellerRes, ordRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/packs'),
        fetch('/api/reseller-packs'),
        fetch('/api/orders', { headers }),
      ]);
      const [prodData, catData, packData, resellerData, ordData] = await Promise.all([
        prodRes.json(), catRes.json(), packRes.json(), resellerRes.json(), ordRes.json()
      ]);
      if (prodData.success) setProducts(prodData.products);
      if (catData.success) setCategories(catData.categories);
      if (packData.success) setPacks(packData.packs);
      if (resellerData.success) setResellerPacks(resellerData.resellerPacks);
      if (ordData.success) setOrders(ordData.orders);
    } catch (error) {
      console.error('Erreur chargement admin:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ===== DÉCONNEXION ===== */
  const handleLogout = () => {
    localStorage.removeItem('feelme_admin_token');
    router.push('/admin/login');
  };

  /* ===== HELPER : requête authentifiée ===== */
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      ...options.headers as Record<string, string>,
    };
    
    // Ne pas ajouter Content-Type pour FormData (le navigateur le fait automatiquement avec boundary)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    return fetch(url, {
      ...options,
      headers,
    });
  };

  if (!token) return null;

  /* ===== ONGLETS DE NAVIGATION ===== */
  const tabs = [
    { id: 'dashboard' as const, label: 'Tableau de bord', icon: BarChart3 },
    { id: 'products' as const, label: 'Produits', icon: Package },
    { id: 'categories' as const, label: 'Catégories', icon: Tag },
    { id: 'packs' as const, label: 'Packs', icon: Layers },
    { id: 'reseller-packs' as const, label: 'Packs Revendeurs', icon: Users },
    { id: 'orders' as const, label: 'Commandes', icon: ShoppingCart },
    { id: 'settings' as const, label: 'Paramètres', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] flex">
      {/* ==========================================
          SIDEBAR NAVIGATION
          ========================================== */}
      {/* Overlay mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-[#f0e6d3] flex flex-col z-50 transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="p-6 border-b border-[#f0e6d3]">
          <h1 className="font-[var(--font-playfair)] text-2xl font-bold italic text-[#c9a84c]">Feel Me</h1>
          <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">Administration</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#c9a84c] text-white shadow-md shadow-[#c9a84c]/20'
                  : 'text-gray-600 hover:bg-[#f9f3e8] hover:text-[#c9a84c]'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Déconnexion */}
        <div className="p-4 border-t border-[#f0e6d3]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ==========================================
          CONTENU PRINCIPAL
          ========================================== */}
      <main className="flex-1 min-w-0">
        {/* Header mobile */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-[#f0e6d3] px-4 py-3 flex items-center justify-between">
          <button onClick={() => setMobileMenuOpen(true)} className="text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-[var(--font-playfair)] text-lg font-bold italic text-[#c9a84c]">Feel Me Admin</span>
          <button onClick={handleLogout} className="text-red-400"><LogOut className="w-5 h-5" /></button>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#c9a84c] animate-spin" />
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <DashboardTab products={products} packs={packs} orders={orders} categories={categories} />}
              {activeTab === 'products' && <ProductsTab products={products} categories={categories} authFetch={authFetch} onRefresh={loadData} />}
              {activeTab === 'categories' && <CategoriesTab categories={categories} authFetch={authFetch} onRefresh={loadData} />}
              {activeTab === 'packs' && <PacksTab packs={packs} products={products} categories={categories} authFetch={authFetch} onRefresh={loadData} />}
              {activeTab === 'reseller-packs' && <ResellerPacksTab resellerPacks={resellerPacks} products={products} categories={categories} authFetch={authFetch} onRefresh={loadData} />}
              {activeTab === 'orders' && <OrdersTab orders={orders} authFetch={authFetch} onRefresh={loadData} />}
              {activeTab === 'settings' && <SettingsTab authFetch={authFetch} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ===============================================================
   ONGLET : TABLEAU DE BORD (stats détaillées + canaux de paiement)
   =============================================================== */
function DashboardTab({ products, packs, orders, categories }: {
  products: ProductData[]; packs: PackData[]; orders: OrderData[]; categories: CategoryData[];
}) {
  /* --- Commandes confirmées (payées, expédiées, livrées) --- */
  const confirmedOrders = orders.filter(o => o.status === 'paid' || o.status === 'delivered' || o.status === 'shipped');
  const totalRevenue = confirmedOrders.reduce((sum, o) => sum + (o.totalAmount || o.total_amount || 0), 0);
  const totalDeposits = orders.reduce((sum, o) => sum + (o.deposit || 0), 0);
  const totalRemaining = orders.reduce((sum, o) => sum + (o.remaining || 0), 0);

  /* --- Stats par statut de commande --- */
  const statusCounts: Record<string, number> = {};
  orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

  /* --- Stats site vs manuel --- */
  const siteOrders = orders.filter(o => o.source !== 'manual');
  const manualOrders = orders.filter(o => o.source === 'manual');
  const siteRevenue = siteOrders.filter(o => o.status === 'paid' || o.status === 'delivered' || o.status === 'shipped')
    .reduce((sum, o) => sum + (o.totalAmount || o.total_amount || 0), 0);
  const manualRevenue = manualOrders.filter(o => o.status === 'paid' || o.status === 'delivered' || o.status === 'shipped')
    .reduce((sum, o) => sum + (o.totalAmount || o.total_amount || 0), 0);

  /* --- Stats par canal de paiement --- */
  /* PayTech n'est pas un canal réel, c'est un intermédiaire.
     Les vrais canaux (Wave, OM, etc.) sont renvoyés par l'IPN PayTech.
     Si paymentMethod est 'PayTech' ou absent, on le classe en 'Paiement en ligne'. */
  const paymentChannels: Record<string, { count: number; revenue: number }> = {};
  orders.forEach(o => {
    let method = o.payment_method || o.paymentMethod || 'Non précisé';
    /* Normaliser : PayTech n'est pas un canal final */
    if (method === 'PayTech') method = 'Paiement en ligne';
    if (!paymentChannels[method]) paymentChannels[method] = { count: 0, revenue: 0 };
    paymentChannels[method].count += 1;
    paymentChannels[method].revenue += (o.totalAmount || o.total_amount || 0);
  });
  /* Trier par revenu décroissant */
  const sortedChannels = Object.entries(paymentChannels).sort((a, b) => b[1].revenue - a[1].revenue);
  const maxChannelRevenue = sortedChannels.length > 0 ? sortedChannels[0][1].revenue : 1;

  /* --- Couleurs par canal de paiement --- */
  const channelColors: Record<string, string> = {
    'Wave': 'bg-blue-500', 'Orange Money': 'bg-orange-500', 'Free Money': 'bg-green-500',
    'Especes': 'bg-yellow-500', 'Paiement en ligne': 'bg-indigo-400', 'Virement bancaire': 'bg-teal-500',
    'WhatsApp': 'bg-emerald-500', 'Telephone': 'bg-purple-500', 'En boutique': 'bg-pink-500',
    'Non précisé': 'bg-gray-300',
  };

  const catalogStats = [
    { label: 'Produits', value: products.length, icon: Package, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Catégories', value: categories.length, icon: Tag, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Packs', value: packs.length, icon: Layers, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Commandes', value: orders.length, icon: ShoppingCart, color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  return (
    <div>
      <h2 className="font-[var(--font-playfair)] text-2xl font-bold text-gray-800 mb-6">Tableau de bord</h2>

      {/* === LIGNE 1 : Revenus principaux === */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-[#c9a84c] to-[#e8d48b] rounded-2xl p-5 text-white">
          <p className="text-xs opacity-80 mb-1">Revenus confirmés</p>
          <p className="text-2xl font-bold">{totalRevenue.toLocaleString('fr-FR')} FCFA</p>
          <p className="text-xs opacity-70 mt-1">{confirmedOrders.length} commande{confirmedOrders.length > 1 ? 's' : ''} payée{confirmedOrders.length > 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#f0e6d3] p-5">
          <p className="text-xs text-gray-400 mb-1">Acomptes reçus</p>
          <p className="text-2xl font-bold text-green-600">{totalDeposits.toLocaleString('fr-FR')} F</p>
          <p className="text-xs text-gray-400 mt-1">Sur commandes manuelles</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#f0e6d3] p-5">
          <p className="text-xs text-gray-400 mb-1">Restants dus</p>
          <p className="text-2xl font-bold text-red-500">{totalRemaining.toLocaleString('fr-FR')} F</p>
          <p className="text-xs text-gray-400 mt-1">A encaisser</p>
        </div>
      </div>

      {/* === LIGNE 2 : Catalogue === */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {catalogStats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#f0e6d3] p-4">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-2`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-xl font-bold text-gray-800">{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* === LIGNE 3 : Statuts + Source === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Stats par statut */}
        <div className="bg-white rounded-2xl border border-[#f0e6d3] p-5">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Par statut</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { key: 'pending', label: 'En attente', color: 'text-yellow-600', bg: 'bg-yellow-50' },
              { key: 'paid', label: 'Payées', color: 'text-green-600', bg: 'bg-green-50' },
              { key: 'shipped', label: 'Expédiées', color: 'text-blue-600', bg: 'bg-blue-50' },
              { key: 'delivered', label: 'Livrées', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { key: 'cancelled', label: 'Annulées', color: 'text-red-600', bg: 'bg-red-50' },
            ].map((st) => (
              <div key={st.key} className={`${st.bg} rounded-xl p-3 text-center`}>
                <p className={`text-lg font-bold ${st.color}`}>{statusCounts[st.key] || 0}</p>
                <p className="text-xs text-gray-500">{st.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats site vs manuel */}
        <div className="bg-white rounded-2xl border border-[#f0e6d3] p-5">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Par source</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[#faf6eb] rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-800">Site web</p>
                <p className="text-xs text-gray-400">{siteOrders.length} commande{siteOrders.length > 1 ? 's' : ''}</p>
              </div>
              <p className="text-sm font-bold text-[#c9a84c]">{siteRevenue.toLocaleString('fr-FR')} F</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-800">Manuelles</p>
                <p className="text-xs text-gray-400">{manualOrders.length} commande{manualOrders.length > 1 ? 's' : ''}</p>
              </div>
              <p className="text-sm font-bold text-blue-600">{manualRevenue.toLocaleString('fr-FR')} F</p>
            </div>
          </div>
        </div>
      </div>

      {/* === LIGNE 4 : Stats par canal de paiement === */}
      <div className="bg-white rounded-2xl border border-[#f0e6d3] p-5 mb-6">
        <h3 className="font-semibold text-gray-800 text-sm mb-4">Paiements par canal</h3>
        {sortedChannels.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune donnée</p>
        ) : (
          <div className="space-y-3">
            {sortedChannels.map(([method, data]) => {
              const pct = Math.round((data.revenue / maxChannelRevenue) * 100);
              const barColor = channelColors[method] || 'bg-gray-400';
              return (
                <div key={method}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${barColor}`} />
                      <span className="text-sm font-medium text-gray-700">{method}</span>
                      <span className="text-xs text-gray-400">({data.count})</span>
                    </div>
                    <span className="text-sm font-bold text-gray-800">{data.revenue.toLocaleString('fr-FR')} F</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* === LIGNE 5 : Dernières commandes === */}
      <div className="bg-white rounded-2xl border border-[#f0e6d3] p-5">
        <h3 className="font-semibold text-gray-800 text-sm mb-4">Dernières commandes</h3>
        {orders.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucune commande pour le moment</p>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 8).map((order) => {
              const name = `${order.first_name || order.firstName || ''} ${order.last_name || order.lastName || ''}`.trim();
              const amount = order.totalAmount || order.total_amount || 0;
              const method = order.payment_method || order.paymentMethod;
              const isManual = order.source === 'manual';
              return (
                <div key={order.id} className="flex items-center gap-3 p-3 bg-[#fafafa] rounded-xl">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono font-medium text-gray-800">{order.ref}</p>
                      <StatusBadge status={order.status} />
                      {isManual && <span className="text-[9px] bg-blue-50 text-blue-600 font-semibold px-1.5 py-0.5 rounded-full">M</span>}
                    </div>
                    <p className="text-xs text-gray-400">{name} {method ? `• ${method}` : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-[#c9a84c]">{amount.toLocaleString('fr-FR')} F</p>
                    {(order.remaining || 0) > 0 && <p className="text-[10px] text-red-500">Reste {(order.remaining || 0).toLocaleString('fr-FR')} F</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===============================================================
   COMPOSANT BADGE STATUT
   =============================================================== */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-600',
    paid: 'bg-green-50 text-green-600',
    shipped: 'bg-blue-50 text-blue-600',
    delivered: 'bg-emerald-50 text-emerald-600',
    cancelled: 'bg-red-50 text-red-600',
  };
  const labels: Record<string, string> = {
    pending: 'En attente', paid: 'Payée', shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-50 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}

/* ===============================================================
   ONGLET : PRODUITS (CRUD complet avec images et prix promo)
   =============================================================== */
function ProductsTab({ products, categories, authFetch, onRefresh }: {
  products: ProductData[]; categories: CategoryData[];
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', price: '', promoPrice: '',
    categoryId: '', volume: '', stock: '100', image: '',
  });

  /* --- Upload image vers le serveur --- */
  const [uploading, setUploading] = useState(false);
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await authFetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setForm({ ...form, image: data.url });
      } else {
        alert('Erreur lors de l\'upload de l\'image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Erreur lors de l\'upload de l\'image');
    } finally {
      setUploading(false);
    }
  };

  /* --- Préparer le formulaire pour édition --- */
  const startEdit = (product: ProductData) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      promoPrice: product.promoPrice ? String(product.promoPrice) : '',
      categoryId: String(product.categoryId),
      volume: product.volume || '',
      stock: String(product.stock),
      image: product.image || '',
    });
    setShowForm(true);
  };

  /* --- Réinitialiser le formulaire --- */
  const resetForm = () => {
    setEditingId(null);
    setForm({ name: '', description: '', price: '', promoPrice: '', categoryId: '', volume: '', stock: '100', image: '' });
    setShowForm(false);
  };

  /* --- Sauvegarder (création ou modification) --- */
  const handleSave = async () => {
    if (!form.name || !form.price || !form.categoryId) return;
    setSaving(true);
    try {
      const url = editingId ? `/api/products/${editingId}` : '/api/products';
      const method = editingId ? 'PUT' : 'POST';
      await authFetch(url, { method, body: JSON.stringify(form) });
      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Erreur sauvegarde produit:', error);
    } finally {
      setSaving(false);
    }
  };

  /* --- Supprimer un produit --- */
  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce produit ?')) return;
    try {
      const res = await authFetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert(`Erreur: ${data.error || 'Impossible de supprimer le produit'}`);
      }
    } catch (error) {
      console.error('Erreur suppression produit:', error);
      alert('Erreur lors de la suppression du produit');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-[var(--font-playfair)] text-2xl font-bold text-gray-800">Produits</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-[#c9a84c] text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-[#a88a2e] transition-colors">
          <Plus className="w-4 h-4" /> Nouveau produit
        </button>
      </div>

      {/* --- Formulaire produit --- */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-[#f0e6d3] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">{editingId ? 'Modifier le produit' : 'Nouveau produit'}</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nom *</label>
              <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30" placeholder="Musc Tahara 3ml" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Catégorie *</label>
              <select value={form.categoryId} onChange={(e) => setForm({...form, categoryId: e.target.value})}
                className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30">
                <option value="">Choisir une catégorie</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Prix (FCFA) *</label>
              <input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})}
                className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30" placeholder="2000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Prix Promo (FCFA)</label>
              <input type="number" value={form.promoPrice} onChange={(e) => setForm({...form, promoPrice: e.target.value})}
                className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30" placeholder="1500 (laisser vide si pas de promo)" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Volume</label>
              <input value={form.volume} onChange={(e) => setForm({...form, volume: e.target.value})}
                className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30" placeholder="3ml, 6ml..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Stock</label>
              <input type="number" value={form.stock} onChange={(e) => setForm({...form, stock: e.target.value})}
                className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30" placeholder="100" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2}
                className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30 resize-none" placeholder="Description du produit..." />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Image</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2.5 bg-[#f9f3e8] border border-[#f0e6d3] rounded-xl text-sm cursor-pointer hover:bg-[#f0e6d3] transition-colors">
                  <ImageIcon className="w-4 h-4 text-[#c9a84c]" />
                  <span className="text-gray-600">Choisir une image</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {form.image && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#f0e6d3]">
                    <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={resetForm} className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700">Annuler</button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-[#c9a84c] text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-[#a88a2e] transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </div>
      )}

      {/* --- Liste des produits --- */}
      <div className="bg-white rounded-2xl border border-[#f0e6d3] overflow-hidden">
        {products.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Aucun produit</div>
        ) : (
          <div className="divide-y divide-[#f0e6d3]">
            {products.map((product) => {
              const productId = (product as any).dataValues?.id || product.id;
              return (
              <div key={productId} className="flex items-center gap-4 p-4 hover:bg-[#fafafa] transition-colors">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#f9f3e8] flex-shrink-0">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-[#c9a84c]/30" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{product.category?.name || 'Sans catégorie'}</span>
                    {product.volume && <span className="text-xs bg-[#f9f3e8] text-[#c9a84c] px-1.5 py-0.5 rounded">{product.volume}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {product.promoPrice ? (
                    <div>
                      <span className="text-sm font-bold text-[#c9a84c]">{product.promoPrice.toLocaleString('fr-FR')} F</span>
                      <span className="text-xs text-gray-400 line-through ml-1">{product.price.toLocaleString('fr-FR')} F</span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-[#c9a84c]">{product.price.toLocaleString('fr-FR')} F</span>
                  )}
                  <p className="text-xs text-gray-400">Stock: {product.stock}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(product)} className="p-2 text-gray-400 hover:text-[#c9a84c] transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(productId)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===============================================================
   ONGLET : CATÉGORIES
   =============================================================== */
function CategoriesTab({ categories, authFetch, onRefresh }: {
  categories: CategoryData[];
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '' });

  const startEdit = (cat: CategoryData) => {
    setEditingId(cat.id);
    setForm({ name: cat.name });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: '' });
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const url = editingId ? `/api/categories/${editingId}` : '/api/categories';
      const method = editingId ? 'PUT' : 'POST';
      const res = await authFetch(url, { method, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) {
        resetForm();
        onRefresh();
      } else {
        alert(`Erreur: ${data.error || 'Impossible de sauvegarder la catégorie'}`);
      }
    } catch (error) {
      console.error('Erreur sauvegarde catégorie:', error);
      alert('Erreur lors de la sauvegarde de la catégorie');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette catégorie ?')) return;
    try {
      const res = await authFetch(`/api/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert(`Erreur: ${data.error || 'Impossible de supprimer la catégorie'}`);
      }
    } catch (error) {
      console.error('Erreur suppression catégorie:', error);
      alert('Erreur lors de la suppression de la catégorie');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-[var(--font-playfair)] text-2xl font-bold text-gray-800">Catégories</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-[#c9a84c] text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-[#a88a2e] transition-colors">
          <Plus className="w-4 h-4" /> Nouvelle catégorie
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#f0e6d3] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">{editingId ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nom de la catégorie *</label>
            <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
              className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30" placeholder="Ex: Musc, Parfums, Huiles..." />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={resetForm} className="px-4 py-2.5 text-sm text-gray-500">Annuler</button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-[#c9a84c] text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-[#a88a2e] disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#f0e6d3] overflow-hidden">
        {categories.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Aucune catégorie</div>
        ) : (
          <div className="divide-y divide-[#f0e6d3]">
            {categories.map((cat) => {
              const catId = (cat as any).dataValues?.id || cat.id;
              return (
              <div key={catId} className="flex items-center gap-4 p-4 hover:bg-[#fafafa]">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#f9f3e8] flex-shrink-0">
                  {cat.image ? <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Tag className="w-5 h-5 text-[#c9a84c]/30" /></div>}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{cat.name}</p>
                  <p className="text-xs text-gray-400">{cat.description || 'Sans description'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(cat)} className="p-2 text-gray-400 hover:text-[#c9a84c]"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(catId)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===============================================================
   ONGLET : PACKS (configurables avec quantités par produit)
   =============================================================== */
function PacksTab({ packs, products, categories, authFetch, onRefresh }: {
  packs: PackData[]; products: ProductData[]; categories: CategoryData[];
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: '', promoPrice: '', image: '', categoryId: '' });
  const [packItems, setPackItems] = useState<PackItem[]>([]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await authFetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setForm({ ...form, image: data.url });
      } else {
        alert('Erreur lors de l\'upload de l\'image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Erreur lors de l\'upload de l\'image');
    } finally {
      setUploading(false);
    }
  };

  /* --- Ajouter un produit au pack --- */
  const addPackItem = () => {
    setPackItems([...packItems, { productId: 0, productName: '', quantity: 1 }]);
  };

  /* --- Modifier un item du pack --- */
  const updatePackItem = (index: number, field: string, value: any) => {
    const updated = [...packItems];
    if (field === 'productId') {
      updated[index].productId = parseInt(value);
      const prod = products.find(p => p.id === parseInt(value));
      updated[index].productName = prod?.name || '';
    } else if (field === 'quantity') {
      updated[index].quantity = parseInt(value) || 1;
    }
    setPackItems(updated);
  };

  /* --- Supprimer un item du pack --- */
  const removePackItem = (index: number) => {
    setPackItems(packItems.filter((_, i) => i !== index));
  };

  const startEdit = (pack: PackData) => {
    setEditingId(pack.id);
    setForm({
      name: pack.name, description: pack.description || '',
      price: String(pack.price), promoPrice: pack.promoPrice ? String(pack.promoPrice) : '',
      image: pack.image || '',
      categoryId: pack.categoryId ? String(pack.categoryId) : '',
    });
    setPackItems(pack.items || []);
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: '', description: '', price: '', promoPrice: '', image: '', categoryId: '' });
    setPackItems([]);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || packItems.length === 0) return;
    setSaving(true);
    try {
      const url = editingId ? `/api/packs/${editingId}` : '/api/packs';
      const method = editingId ? 'PUT' : 'POST';
      await authFetch(url, { method, body: JSON.stringify({ ...form, items: packItems }) });
      resetForm();
      onRefresh();
    } catch (error) { console.error(error); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce pack ?')) return;
    try {
      const res = await authFetch(`/api/packs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert(`Erreur: ${data.error || 'Impossible de supprimer le pack'}`);
      }
    } catch (error) {
      console.error('Erreur suppression pack:', error);
      alert('Erreur lors de la suppression du pack');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-[var(--font-playfair)] text-2xl font-bold text-gray-800">Packs</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-[#c9a84c] text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-[#a88a2e]">
          <Plus className="w-4 h-4" /> Nouveau pack
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#f0e6d3] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">{editingId ? 'Modifier le pack' : 'Nouveau pack'}</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nom du pack *</label>
              <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30" placeholder="Pack 3x3ml" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Prix du pack (FCFA) *</label>
              <input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})}
                className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30" placeholder="6000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Prix Promo (FCFA)</label>
              <input type="number" value={form.promoPrice} onChange={(e) => setForm({...form, promoPrice: e.target.value})}
                className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30" placeholder="3500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Catégorie</label>
              <select value={form.categoryId} onChange={(e) => setForm({...form, categoryId: e.target.value})}
                className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30">
                <option value="">Aucune catégorie</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
                className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30" placeholder="Description du pack..." />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Image</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2.5 bg-[#f9f3e8] border border-[#f0e6d3] rounded-xl text-sm cursor-pointer hover:bg-[#f0e6d3]">
                  <ImageIcon className="w-4 h-4 text-[#c9a84c]" /> <span className="text-gray-600">Choisir</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {form.image && <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#f0e6d3]"><img src={form.image} alt="" className="w-full h-full object-cover" /></div>}
              </div>
            </div>
          </div>

          {/* --- Configuration des produits du pack --- */}
          <div className="border-t border-[#f0e6d3] pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Produits du pack *</h4>
              <button onClick={addPackItem}
                className="flex items-center gap-1 text-xs text-[#c9a84c] font-medium hover:text-[#a88a2e]">
                <Plus className="w-3 h-3" /> Ajouter un produit
              </button>
            </div>
            {packItems.length === 0 ? (
              <p className="text-xs text-gray-400 py-3">Ajoutez des produits au pack</p>
            ) : (
              <div className="space-y-2">
                {packItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-[#fafafa] rounded-xl p-3">
                    <select value={item.productId} onChange={(e) => updatePackItem(idx, 'productId', e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-[#f0e6d3] rounded-lg text-sm">
                      <option value={0}>Choisir un produit</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.volume ? `(${p.volume})` : ''}</option>)}
                    </select>
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-gray-400">Qté:</label>
                      <input type="number" min="1" value={item.quantity} onChange={(e) => updatePackItem(idx, 'quantity', e.target.value)}
                        className="w-16 px-2 py-2 bg-white border border-[#f0e6d3] rounded-lg text-sm text-center" />
                    </div>
                    <button onClick={() => removePackItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button onClick={resetForm} className="px-4 py-2.5 text-sm text-gray-500">Annuler</button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-[#c9a84c] text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-[#a88a2e] disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </div>
      )}

      {/* --- Liste des packs --- */}
      <div className="bg-white rounded-2xl border border-[#f0e6d3] overflow-hidden">
        {packs.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Aucun pack</div>
        ) : (
          <div className="divide-y divide-[#f0e6d3]">
            {packs.map((pack) => {
              const packId = (pack as any).dataValues?.id || pack.id;
              return (
                <div key={packId} className="flex items-center gap-4 p-4 hover:bg-[#fafafa] transition-colors">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#f9f3e8] flex-shrink-0">
                    {pack.image ? <img src={pack.image} alt={pack.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Layers className="w-5 h-5 text-[#c9a84c]/30" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{pack.name}</p>
                    <p className="text-xs text-gray-400">
                      {pack.items?.map(i => `${i.quantity}x ${i.productName || `Produit #${i.productId}`}`).join(', ')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {pack.promoPrice ? (
                      <div>
                        <span className="text-sm font-bold text-[#c9a84c]">{pack.promoPrice.toLocaleString('fr-FR')} F</span>
                        <span className="text-xs text-gray-400 line-through ml-1">{pack.price.toLocaleString('fr-FR')} F</span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-[#c9a84c]">{pack.price.toLocaleString('fr-FR')} F</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(pack)} className="p-2 text-gray-400 hover:text-[#c9a84c]"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(packId)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===============================================================
   ONGLET : COMMANDES (liste + changement de statut + création manuelle)
   =============================================================== */
function OrdersTab({ orders, authFetch, onRefresh }: {
  orders: OrderData[];
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onRefresh: () => void;
}) {
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState<number | null>(null);
  /* --- État formulaire commande manuelle --- */
  const [showManualForm, setShowManualForm] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [manualForm, setManualForm] = useState({
    firstName: '', lastName: '', phone: '', email: '', address: '',
    totalAmount: '', deposit: '', paymentMethod: 'Especes', notes: '',
    itemsText: '', // Format libre : "2x Parfum 6ml, 1x Pack Duo"
  });

  /* --- Télécharger la facture PDF d'une commande --- */
  const handleDownloadInvoice = async (orderId: number, orderRef: string) => {
    setDownloadingInvoice(orderId);
    try {
      const res = await authFetch(`/api/orders/${orderId}/invoice`);
      if (!res.ok) throw new Error('Erreur téléchargement facture');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Facture-${orderRef}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) { console.error('Erreur téléchargement facture:', error); }
    finally { setDownloadingInvoice(null); }
  };

  /* --- Changer le statut d'une commande --- */
  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setUpdatingStatus(orderId);
    try {
      await authFetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      onRefresh();
    } catch (error) { console.error(error); }
    finally { setUpdatingStatus(null); }
  };

  /* --- Créer une commande manuelle --- */
  const handleCreateManualOrder = async () => {
    if (!manualForm.firstName || !manualForm.lastName || !manualForm.phone || !manualForm.totalAmount) return;
    setCreatingOrder(true);
    try {
      /* Convertir le texte articles en tableau items */
      const items = manualForm.itemsText.split(',').filter(s => s.trim()).map((s) => {
        const trimmed = s.trim();
        const match = trimmed.match(/^(\d+)\s*x\s*(.+)/i);
        if (match) {
          return { type: 'product' as const, itemId: 0, name: match[2].trim(), quantity: parseInt(match[1]), unitPrice: 0 };
        }
        return { type: 'product' as const, itemId: 0, name: trimmed, quantity: 1, unitPrice: 0 };
      });

      const res = await authFetch('/api/orders/manual', {
        method: 'POST',
        body: JSON.stringify({
          firstName: manualForm.firstName,
          lastName: manualForm.lastName,
          phone: manualForm.phone,
          email: manualForm.email || undefined,
          address: manualForm.address || undefined,
          items,
          totalAmount: Number(manualForm.totalAmount),
          deposit: Number(manualForm.deposit) || 0,
          paymentMethod: manualForm.paymentMethod,
          notes: manualForm.notes || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowManualForm(false);
        setManualForm({ firstName: '', lastName: '', phone: '', email: '', address: '', totalAmount: '', deposit: '', paymentMethod: 'Especes', notes: '', itemsText: '' });
        onRefresh();
      }
    } catch (error) { console.error('Erreur création commande manuelle:', error); }
    finally { setCreatingOrder(false); }
  };

  return (
    <div>
      {/* --- En-tête + bouton Nouvelle commande --- */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-[var(--font-playfair)] text-2xl font-bold text-gray-800">Commandes</h2>
        <button
          onClick={() => setShowManualForm(!showManualForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#c9a84c] to-[#e8d48b] text-white text-sm font-semibold rounded-xl hover:shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          Nouvelle commande
        </button>
      </div>

      {/* ==========================================
          FORMULAIRE COMMANDE MANUELLE
          ========================================== */}
      {showManualForm && (
        <div className="bg-white rounded-2xl border border-[#f0e6d3] p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Enregistrer une commande externe</h3>
          <p className="text-xs text-gray-400 mb-4">Commande reçue par téléphone, WhatsApp, en boutique, etc.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Prénom */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Prénom *</label>
              <input type="text" value={manualForm.firstName} onChange={(e) => setManualForm({ ...manualForm, firstName: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30" placeholder="Prénom du client" />
            </div>
            {/* Nom */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nom *</label>
              <input type="text" value={manualForm.lastName} onChange={(e) => setManualForm({ ...manualForm, lastName: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30" placeholder="Nom du client" />
            </div>
            {/* Téléphone */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Téléphone *</label>
              <input type="tel" value={manualForm.phone} onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30" placeholder="+221 77 000 00 00" />
            </div>
            {/* Email (optionnel) */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input type="email" value={manualForm.email} onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30" placeholder="Optionnel" />
            </div>
          </div>

          {/* Adresse */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">Adresse de livraison</label>
            <input type="text" value={manualForm.address} onChange={(e) => setManualForm({ ...manualForm, address: e.target.value })}
              className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30" placeholder="Adresse (optionnel)" />
          </div>

          {/* Articles (texte libre) */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">Articles commandés</label>
            <textarea value={manualForm.itemsText} onChange={(e) => setManualForm({ ...manualForm, itemsText: e.target.value })}
              rows={2} className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30 resize-none"
              placeholder="Ex: 2x Parfum 6ml, 1x Pack Duo, 3x Brume corporelle" />
            <p className="text-xs text-gray-400 mt-1">Séparez par des virgules. Format : quantité x nom</p>
          </div>

          {/* Montant, Acompte, Mode de paiement */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Montant total (FCFA) *</label>
              <input type="number" value={manualForm.totalAmount} onChange={(e) => setManualForm({ ...manualForm, totalAmount: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30" placeholder="15000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Acompte versé (FCFA)</label>
              <input type="number" value={manualForm.deposit} onChange={(e) => setManualForm({ ...manualForm, deposit: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Reçu comment ?</label>
              <select value={manualForm.paymentMethod} onChange={(e) => setManualForm({ ...manualForm, paymentMethod: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30">
                <option value="Especes">Espèces</option>
                <option value="Wave">Wave</option>
                <option value="Orange Money">Orange Money</option>
                <option value="Free Money">Free Money</option>
                <option value="Virement bancaire">Virement bancaire</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Telephone">Téléphone</option>
                <option value="En boutique">En boutique</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          </div>

          {/* Restant calculé automatiquement */}
          {manualForm.totalAmount && (
            <div className="mb-4 p-3 bg-[#faf6eb] rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total :</span>
                <span className="font-bold text-gray-800">{Number(manualForm.totalAmount).toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Acompte :</span>
                <span className="font-medium text-green-600">{(Number(manualForm.deposit) || 0).toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-sm border-t border-[#e8d48b] pt-1 mt-1">
                <span className="text-gray-500 font-medium">Restant dû :</span>
                <span className="font-bold text-red-500">{Math.max(0, Number(manualForm.totalAmount) - (Number(manualForm.deposit) || 0)).toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <textarea value={manualForm.notes} onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
              rows={2} className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#f0e6d3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30 resize-none"
              placeholder="Commentaires, instructions spéciales..." />
          </div>

          {/* Boutons */}
          <div className="flex items-center gap-3">
            <button onClick={handleCreateManualOrder} disabled={creatingOrder || !manualForm.firstName || !manualForm.lastName || !manualForm.phone || !manualForm.totalAmount}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#c9a84c] to-[#e8d48b] text-white text-sm font-semibold rounded-xl hover:shadow-md transition-all disabled:opacity-50">
              {creatingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer la commande
            </button>
            <button onClick={() => setShowManualForm(false)} className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-all">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          LISTE DES COMMANDES
          ========================================== */}
      <div className="bg-white rounded-2xl border border-[#f0e6d3] overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Aucune commande</div>
        ) : (
          <div className="divide-y divide-[#f0e6d3]">
            {orders.map((order) => {
              const firstName = order.first_name || order.firstName || '';
              const lastName = order.last_name || order.lastName || '';
              const totalAmount = order.total_amount || order.totalAmount || 0;
              const paymentMethod = order.payment_method || order.paymentMethod;
              const isExpanded = expandedOrder === order.id;
              const isManual = order.source === 'manual';
              const deposit = order.deposit || 0;
              const remaining = order.remaining || 0;

              return (
                <div key={order.id}>
                  {/* --- Ligne résumée --- */}
                  <div
                    className="flex items-center gap-4 p-4 hover:bg-[#fafafa] cursor-pointer"
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono font-bold text-gray-800">{order.ref}</p>
                        <StatusBadge status={order.status} />
                        {isManual && <span className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full">Manuel</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {firstName} {lastName} • {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-[#c9a84c]">{totalAmount.toLocaleString('fr-FR')} FCFA</p>
                      {paymentMethod && <p className="text-xs text-gray-400">{paymentMethod}</p>}
                      {remaining > 0 && <p className="text-xs text-red-500 font-medium">Reste: {remaining.toLocaleString('fr-FR')} F</p>}
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>

                  {/* --- Détails dépliés --- */}
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-[#fafafa]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Client</p>
                          <p className="text-sm font-medium">{firstName} {lastName}</p>
                          <p className="text-xs text-gray-500">{order.phone}</p>
                          <p className="text-xs text-gray-500">{order.email}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Adresse de livraison</p>
                          <p className="text-sm">{order.address}</p>
                        </div>
                      </div>

                      {/* Acompte / Restant (visible si commande manuelle ou si acompte > 0) */}
                      {(isManual || deposit > 0) && (
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="bg-white rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-400">Total</p>
                            <p className="text-sm font-bold text-gray-800">{totalAmount.toLocaleString('fr-FR')} F</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-400">Acompte</p>
                            <p className="text-sm font-bold text-green-600">{deposit.toLocaleString('fr-FR')} F</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-400">Restant dû</p>
                            <p className={`text-sm font-bold ${remaining > 0 ? 'text-red-500' : 'text-green-600'}`}>{remaining.toLocaleString('fr-FR')} F</p>
                          </div>
                        </div>
                      )}

                      {/* Notes admin */}
                      {order.notes && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-xs text-yellow-600 font-medium mb-1">Notes</p>
                          <p className="text-sm text-gray-700">{order.notes}</p>
                        </div>
                      )}

                      {/* Articles */}
                      <div className="mb-4">
                        <p className="text-xs text-gray-400 mb-2">Articles</p>
                        <div className="space-y-1">
                          {order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm bg-white rounded-lg px-3 py-2">
                              <span>{item.quantity}x {item.name}</span>
                              <span className="font-medium">{((item.unitPrice || item.unit_price || 0) * item.quantity).toLocaleString('fr-FR')} F</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Changement de statut + Téléchargement facture */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <label className="text-xs text-gray-400">Statut :</label>
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          disabled={updatingStatus === order.id}
                          className="px-3 py-2 bg-white border border-[#f0e6d3] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30"
                        >
                          <option value="pending">En attente</option>
                          <option value="paid">Payée</option>
                          <option value="shipped">Expédiée</option>
                          <option value="delivered">Livrée</option>
                          <option value="cancelled">Annulée</option>
                        </select>
                        {updatingStatus === order.id && <Loader2 className="w-4 h-4 animate-spin text-[#c9a84c]" />}

                        {/* --- Bouton télécharger facture PDF --- */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownloadInvoice(order.id, order.ref); }}
                          disabled={downloadingInvoice === order.id}
                          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#c9a84c] to-[#e8d48b] text-white text-xs font-semibold rounded-lg hover:shadow-md transition-all disabled:opacity-50"
                        >
                          {downloadingInvoice === order.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <FileDown className="w-3.5 h-3.5" />}
                          Facture PDF
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===============================================================
   ONGLET : PARAMÈTRES ENTREPRISE
   Permet à l'admin de configurer : nom, email, téléphone,
   adresse et site web de l'entreprise.
   Ces infos apparaissent sur les factures PDF et emails.
   =============================================================== */
function SettingsTab({ authFetch }: {
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    companyWebsite: '',
  });

  /* --- Charger les paramètres actuels --- */
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          const s = data.settings;
          setForm({
            companyName: s.company_name || s.companyName || '',
            companyEmail: s.company_email || s.companyEmail || '',
            companyPhone: s.company_phone || s.companyPhone || '',
            companyAddress: s.company_address || s.companyAddress || '',
            companyWebsite: s.company_website || s.companyWebsite || '',
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* --- Sauvegarder les paramètres --- */
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await authFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Erreur sauvegarde paramètres:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#c9a84c] animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-[var(--font-playfair)] text-2xl font-bold text-gray-800 mb-6">Paramètres entreprise</h2>
      <p className="text-sm text-gray-400 mb-6">
        Ces informations apparaissent sur les factures PDF et dans les emails envoyés aux clients.
      </p>

      <div className="bg-white rounded-2xl border border-[#f0e6d3] p-6 sm:p-8 space-y-5 max-w-2xl">
        {/* Nom de l'entreprise */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Nom de l&apos;entreprise</label>
          <input
            type="text"
            name="companyName"
            value={form.companyName}
            onChange={handleChange}
            placeholder="Feel Me"
            className="w-full px-4 py-3 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30 focus:border-[#c9a84c] transition-all"
          />
        </div>

        {/* Email entreprise */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Email entreprise</label>
          <input
            type="email"
            name="companyEmail"
            value={form.companyEmail}
            onChange={handleChange}
            placeholder="contact@feel-me.store"
            className="w-full px-4 py-3 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30 focus:border-[#c9a84c] transition-all"
          />
        </div>

        {/* Téléphone */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Téléphone</label>
          <input
            type="tel"
            name="companyPhone"
            value={form.companyPhone}
            onChange={handleChange}
            placeholder="+221 77 000 00 00"
            className="w-full px-4 py-3 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30 focus:border-[#c9a84c] transition-all"
          />
        </div>

        {/* Adresse */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Adresse</label>
          <textarea
            name="companyAddress"
            value={form.companyAddress}
            onChange={handleChange}
            placeholder="Dakar, Sénégal"
            rows={2}
            className="w-full px-4 py-3 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30 focus:border-[#c9a84c] transition-all resize-none"
          />
        </div>

        {/* Site web */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Site web</label>
          <input
            type="text"
            name="companyWebsite"
            value={form.companyWebsite}
            onChange={handleChange}
            placeholder="www.feel-me.store"
            className="w-full px-4 py-3 bg-[#fafafa] border border-[#f0e6d3] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30 focus:border-[#c9a84c] transition-all"
          />
        </div>

        {/* Bouton sauvegarder */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#c9a84c] to-[#e8d48b] text-white font-semibold rounded-xl hover:shadow-md transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">Paramètres sauvegardés !</span>
          )}
        </div>
      </div>
    </div>
  );
}
