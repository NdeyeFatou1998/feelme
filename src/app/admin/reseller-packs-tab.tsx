/**
 * ============================================
 * FEEL ME - Composant ResellerPacksTab
 * Gestion des packs revendeurs dans le dashboard admin
 * ============================================
 */

import React, { useState } from 'react';
import { Plus, Trash2, Edit3, Save, X, Layers, TrendingUp } from 'lucide-react';

interface ProductData {
  id: number;
  name: string;
  price: number;
  promoPrice: number | null;
}

interface ResellerPackData {
  id: number;
  name: string;
  description: string | null;
  normalPrice: number;
  resellerPrice: number;
  profit: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  image: string | null;
  categoryId: number | null;
  items: Array<{ productId: number; productName?: string; quantity: number }>;
  isActive: boolean;
}

interface CategoryData {
  id: number;
  name: string;
}

interface ResellerPacksTabProps {
  resellerPacks: ResellerPackData[];
  products: ProductData[];
  categories: CategoryData[];
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onRefresh: () => void;
}

export default function ResellerPacksTab({ resellerPacks, products, categories, authFetch, onRefresh }: ResellerPacksTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '20',
    image: '',
    categoryId: '',
  });
  const [packItems, setPackItems] = useState<Array<{ productId: number; quantity: number }>>([]);

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

  const resetForm = () => {
    setForm({ name: '', description: '', discountType: 'percentage', discountValue: '20', image: '', categoryId: '' });
    setPackItems([]);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (pack: ResellerPackData) => {
    setForm({
      name: pack.name,
      description: pack.description || '',
      discountType: pack.discountType || 'percentage',
      discountValue: pack.discountValue?.toString() || '20',
      image: pack.image || '',
      categoryId: pack.categoryId ? pack.categoryId.toString() : '',
    });
    setPackItems(pack.items.map(i => ({ productId: i.productId, quantity: i.quantity })));
    setEditingId(pack.id);
    setShowForm(true);
  };

  const addPackItem = () => {
    if (products.length === 0) {
      alert('Aucun produit disponible. Veuillez d\'abord créer des produits.');
      return;
    }
    setPackItems([...packItems, { productId: products[0].id, quantity: 1 }]);
  };

  const removePackItem = (index: number) => {
    setPackItems(packItems.filter((_, i) => i !== index));
  };

  const updatePackItem = (index: number, field: 'productId' | 'quantity', value: number) => {
    const updated = [...packItems];
    updated[index][field] = value;
    setPackItems(updated);
  };

  const handleSave = async () => {
    if (!form.name || packItems.length === 0) return;
    setSaving(true);
    try {
      const url = editingId ? `/api/reseller-packs/${editingId}` : '/api/reseller-packs';
      const method = editingId ? 'PUT' : 'POST';
      await authFetch(url, { method, body: JSON.stringify({ ...form, items: packItems }) });
      resetForm();
      onRefresh();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce pack revendeur ?')) return;
    try {
      const res = await authFetch(`/api/reseller-packs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert(`Erreur: ${data.error || 'Impossible de supprimer le pack revendeur'}`);
      }
    } catch (error) {
      console.error('Erreur suppression pack revendeur:', error);
      alert('Erreur lors de la suppression du pack revendeur');
    }
  };

  // Calculer automatiquement les prix en fonction des produits sélectionnés
  const calculatePrices = () => {
    let totalNormalPrice = 0;
    packItems.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const productPrice = product.promoPrice || product.price;
        totalNormalPrice += productPrice * item.quantity;
      }
    });
    
    const discountValue = parseInt(form.discountValue) || 0;
    let resellerPrice = 0;
    
    if (form.discountType === 'percentage') {
      resellerPrice = Math.round(totalNormalPrice * (1 - discountValue / 100));
    } else {
      resellerPrice = totalNormalPrice - discountValue;
    }
    
    const profit = totalNormalPrice - resellerPrice;
    
    return { normalPrice: totalNormalPrice, resellerPrice, profit };
  };
  
  const { normalPrice, resellerPrice, profit } = calculatePrices();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-[var(--font-playfair)] text-2xl font-bold text-gray-800">Packs Revendeurs</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-[#c9a84c] text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-[#a88a2e]"
        >
          <Plus className="w-4 h-4" /> Nouveau pack revendeur
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#f0e6d3] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {editingId ? 'Modifier le pack revendeur' : 'Nouveau pack revendeur'}
            </h3>
            <button onClick={resetForm} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Nom du pack *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/20"
                placeholder="Ex: Pack Revendeur 10x3ml"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Image</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 bg-[#f9f3e8] border border-[#f0e6d3] rounded-lg text-sm cursor-pointer hover:bg-[#f0e6d3] transition-colors">
                  <Layers className="w-4 h-4 text-[#c9a84c]" />
                  <span className="text-gray-600">Choisir une image</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {uploading && <span className="text-xs text-gray-500">Upload en cours...</span>}
                {form.image && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                    <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Catégorie</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/20"
              >
                <option value="">Aucune catégorie</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/20"
                placeholder="Description du pack pour revendeurs"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Remise revendeur</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/20"
                >
                  <option value="percentage">Pourcentage (%)</option>
                  <option value="fixed">Montant fixe (FCFA)</option>
                </select>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  max={form.discountType === 'percentage' ? '100' : undefined}
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/20"
                  placeholder={form.discountType === 'percentage' ? '20' : '5000'}
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {form.discountType === 'percentage' 
                ? 'Pourcentage de remise (ex: 20% = le revendeur paie 80% du prix public)'
                : 'Montant fixe de remise en FCFA (ex: 5000 F de réduction sur le prix public)'}
            </p>
          </div>

          {packItems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Prix public total</label>
                <div className="text-lg font-bold text-gray-800">
                  {normalPrice.toLocaleString('fr-FR')} FCFA
                </div>
                <p className="text-xs text-gray-500 mt-1">Calculé automatiquement</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Prix revendeur</label>
                <div className="text-lg font-bold text-[#c9a84c]">
                  {resellerPrice.toLocaleString('fr-FR')} FCFA
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {form.discountType === 'percentage' 
                    ? `Avec ${form.discountValue}% de remise`
                    : `Avec ${parseInt(form.discountValue || '0').toLocaleString('fr-FR')} F de remise`}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Bénéfice par pack</label>
                <div className="text-lg font-bold text-green-700 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {profit.toLocaleString('fr-FR')} F
                </div>
                <p className="text-xs text-gray-500 mt-1">Gain du revendeur</p>
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-600">Produits inclus *</label>
              <button
                type="button"
                onClick={addPackItem}
                className="text-xs text-[#c9a84c] hover:text-[#a88a2e] font-medium flex items-center gap-1 cursor-pointer hover:underline"
              >
                <Plus className="w-3 h-3" /> Ajouter un produit
              </button>
            </div>
            {packItems.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Aucun produit ajouté</p>
            ) : (
              <div className="space-y-2">
                {packItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={item.productId}
                      onChange={(e) => updatePackItem(index, 'productId', parseInt(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/20"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updatePackItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/20"
                      placeholder="Qté"
                    />
                    <button
                      onClick={() => removePackItem(index)}
                      className="p-2 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name || packItems.length === 0}
              className="flex items-center gap-2 bg-[#c9a84c] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#a88a2e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? <><Save className="w-4 h-4 animate-pulse" /> Enregistrement...</> : <><Save className="w-4 h-4" /> Enregistrer</>}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#f0e6d3] overflow-hidden">
        {resellerPacks.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Aucun pack revendeur</div>
        ) : (
          <div className="divide-y divide-[#f0e6d3]">
            {resellerPacks.map((pack) => {
              const packId = (pack as any).dataValues?.id || pack.id;
              return (
                <div key={packId} className="flex items-center gap-4 p-4 hover:bg-[#fafafa] transition-colors">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#f9f3e8] flex-shrink-0">
                    {pack.image ? (
                      <img src={pack.image} alt={pack.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Layers className="w-5 h-5 text-[#c9a84c]/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{pack.name}</p>
                    <p className="text-xs text-gray-400">
                      {pack.items?.map(i => `${i.quantity}x ${i.productName || `Produit #${i.productId}`}`).join(', ')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Prix normal</p>
                        <p className="text-sm font-bold text-gray-600">{pack.normalPrice.toLocaleString('fr-FR')} F</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Prix revendeur</p>
                        <p className="text-sm font-bold text-[#c9a84c]">{pack.resellerPrice.toLocaleString('fr-FR')} F</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1 text-xs text-green-600 font-semibold">
                      <TrendingUp className="w-3 h-3" />
                      Bénéfice: {pack.profit.toLocaleString('fr-FR')} F
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(pack)} className="p-2 text-gray-400 hover:text-[#c9a84c]">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(packId)} className="p-2 text-gray-400 hover:text-red-500">
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
