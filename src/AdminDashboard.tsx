import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Upload, Trash, Save, Edit2, Package, Layers, Settings, CheckCircle2, BarChart2, Users, ShoppingCart, TrendingUp, Eye } from 'lucide-react';
import { Product, Category, InboxMessage } from './types';
import { supabase } from './supabase';
import './styles.css';

interface AdminDashboardProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  inboxMessages: InboxMessage[];
  onClose: () => void;
}

export default function AdminDashboard({ products, setProducts, categories, setCategories, inboxMessages, onClose }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'products' | 'categories' | 'inbox' | 'users' | 'custom'>('analytics');

  interface CustomRequest { id: string; user_email: string; description: string; image_url: string; status: string; created_at: string; }
  const [customRequests, setCustomRequests] = useState<CustomRequest[]>([]);

  // --- ANALYTICS STATE ---
  interface AnalyticsEvent { event_type: string; product_name: string; material: string; session_id: string; created_at: string; }
  interface CheckoutEvent { total_value: string; item_count: number; items: any[]; created_at: string; }
  interface UserProfile { id: string; email: string; display_name: string; created_at: string; }

  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([]);
  const [checkoutEvents, setCheckoutEvents] = useState<CheckoutEvent[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      const [{ data: events }, { data: checkouts }, { data: users }, { data: customs }] = await Promise.all([
        supabase.from('analytics_events').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('checkout_events').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('custom_requests').select('*').order('created_at', { ascending: false }),
      ]);
      if (events) setAnalyticsEvents(events);
      if (checkouts) setCheckoutEvents(checkouts);
      if (users) setUserProfiles(users);
      if (customs) setCustomRequests(customs);
      setAnalyticsLoading(false);
    }
    loadAnalytics();
  }, []);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [categoryData, setCategoryData] = useState<Partial<Category>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- PRODUCT LOGIC ---
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product });
  };

  const handleAddNewProduct = () => {
    const newProduct: Product = {
      id: `p${Date.now()}`,
      name: 'Neues Produkt',
      material: 'Silber',
      oldPrice: '€0',
      price: '€0',
      off: '',
      tone: 'silver',
      description: '',
      images: []
    };
    setEditingProduct(newProduct);
    setFormData(newProduct);
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;
    const p = formData as Product;
    const row = {
      id: p.id, name: p.name, material: p.material,
      old_price: p.oldPrice, price: p.price, off: p.off,
      tone: p.tone, description: p.description, images: p.images || []
    };
    await supabase.from('products').upsert([row]);
    if (!products.some(pr => pr.id === editingProduct.id)) {
      setProducts([p, ...products]);
    } else {
      setProducts(products.map(pr => pr.id === editingProduct.id ? p : pr));
    }
    setEditingProduct(null);
    showToast('Produkt erfolgreich gespeichert!');
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Produkt wirklich löschen?')) {
      await supabase.from('products').delete().eq('id', id);
      setProducts(products.filter(p => p.id !== id));
      showToast('Produkt gelöscht!');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentImages = formData.images || [];
    if (currentImages.length + files.length > 3) {
      alert('Maximal 3 Bilder erlaubt!');
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData(prev => ({
            ...prev,
            images: [...(prev.images || []), event.target!.result as string]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index)
    }));
  };

  // --- CATEGORY LOGIC ---
  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryData({ ...cat });
  };

  const handleSaveCategory = () => {
    if (!editingCategory) return;
    setCategories(categories.map(c => c.id === editingCategory.id ? categoryData as Category : c));
    setEditingCategory(null);
    showToast('Kategorie erfolgreich gespeichert!');
  };

  return (
    <section className="adminDashboardPremium">
      {/* Toast Notification */}
      <div className={`adminToast ${toastMessage ? 'visible' : ''}`}>
        <CheckCircle2 size={20} />
        {toastMessage}
      </div>

      <div className="adminSidebar">
        <div className="adminLogo">
          <h2>KRYORK <span className="adminBadge">OS</span></h2>
        </div>
        <nav className="adminNav">
            <button className={`adminTab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}><BarChart2 size={18} /> Analytics</button>
            <button className={`adminTab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}><Package size={18} /> Produkte</button>
            <button className={`adminTab ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}><Layers size={18} /> Kategorien</button>
            <button className={`adminTab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}><Users size={18} /> Accounts</button>
            <button className={`adminTab ${activeTab === 'custom' ? 'active' : ''}`} onClick={() => setActiveTab('custom')}><Upload size={18} /> Custom Anfragen</button>
            <button className={`adminTab ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => setActiveTab('inbox')}>
              Inbox
              {inboxMessages.length > 0 && <span className="cartBadge" style={{position:'static', marginLeft: '8px'}}>{inboxMessages.length}</span>}
            </button>
        </nav>
        <button className="adminExitBtn" onClick={onClose}><X size={20} /> Dashboard verlassen</button>
      </div>

      <div className="adminContent">
        {activeTab === 'products' && (
          <div className="adminPanel">
            <div className="adminHeaderPremium">
              <div>
                <h2>Produkt-Manager</h2>
                <p>Verwalte dein Inventar und lade Assets hoch.</p>
              </div>
              {!editingProduct && (
                <button className="btnSolid adminAddBtn" onClick={handleAddNewProduct}>
                  <Plus size={18} /> Neues Produkt
                </button>
              )}
            </div>

            {!editingProduct ? (
              <div className="adminTableContainer">
                <table className="adminTablePremium">
                  <thead>
                    <tr>
                      <th>Media</th>
                      <th>Produkt</th>
                      <th>Preis</th>
                      <th>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id}>
                        <td>
                          {p.images && p.images.length > 0 ? (
                            <img src={p.images[0]} alt={p.name} className="adminThumb" />
                          ) : (
                            <div className={`adminThumbPlaceholder ${p.tone}`} />
                          )}
                        </td>
                        <td>
                          <div className="tdInfo">
                            <strong>{p.name}</strong>
                            <span>{p.material}</span>
                          </div>
                        </td>
                        <td>
                          <div className="tdInfo">
                            <strong>{p.price}</strong>
                            <span><del>{p.oldPrice}</del></span>
                          </div>
                        </td>
                        <td>
                          <div className="tdActions">
                            <button className="iconBtn edit" onClick={() => handleEditProduct(p)}><Edit2 size={16} /></button>
                            <button className="iconBtn delete" onClick={() => handleDeleteProduct(p.id)}><Trash size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="adminEditorPremium">
                <div className="adminEditorHeader">
                  <h3>{editingProduct.id.startsWith('p') && editingProduct.name !== 'Neues Produkt' ? 'Produkt bearbeiten' : 'Neues Produkt anlegen'}</h3>
                  <div className="editorActions">
                    <button className="btnOutline" onClick={() => setEditingProduct(null)}>Abbrechen</button>
                    <button className="btnSolid" onClick={handleSaveProduct}><Save size={18} /> Speichern</button>
                  </div>
                </div>

                <div className="adminFormGrid">
                  <div className="formGroup">
                    <label>Produktname</label>
                    <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="formGroup">
                    <label>Material</label>
                    <input type="text" value={formData.material || ''} onChange={e => setFormData({...formData, material: e.target.value})} />
                  </div>
                  <div className="formGroup">
                    <label>Aktueller Preis</label>
                    <input type="text" value={formData.price || ''} onChange={e => setFormData({...formData, price: e.target.value})} />
                  </div>
                  <div className="formGroup">
                    <label>Alter Preis</label>
                    <input type="text" value={formData.oldPrice || ''} onChange={e => setFormData({...formData, oldPrice: e.target.value})} />
                  </div>
                  <div className="formGroup">
                    <label>Badge Text ("Sparen")</label>
                    <input type="text" value={formData.off || ''} onChange={e => setFormData({...formData, off: e.target.value})} />
                  </div>
                  <div className="formGroup">
                    <label>CSS Tone (Fallback)</label>
                    <select value={formData.tone || 'silver'} onChange={e => setFormData({...formData, tone: e.target.value})}>
                      <option value="silver">Silber</option>
                      <option value="gold">Gold</option>
                      <option value="ring">Ring</option>
                      <option value="gold-set">Gold Set</option>
                    </select>
                  </div>
                  <div className="formGroup fullWidth">
                    <label>Beschreibung</label>
                    <textarea rows={4} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                  </div>
                </div>

                <div className="adminImageSection">
                  <h4>Bilder-Galerie ({formData.images?.length || 0}/3)</h4>
                  <div className="adminImageList">
                    {formData.images?.map((img, i) => (
                      <div key={i} className="adminImagePreview">
                        <img src={img} alt="" />
                        <button onClick={() => removeImage(i)}><Trash size={14} /></button>
                      </div>
                    ))}
                    {(formData.images?.length || 0) < 3 && (
                      <div className="adminUploadDropzone" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={24} />
                        <span>Klicken zum Hochladen</span>
                        <input type="file" ref={fileInputRef} accept="image/*" multiple onChange={handleFileUpload} style={{display: 'none'}} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="adminPanel">
            <div className="adminHeaderPremium">
              <div>
                <h2>Kategorien</h2>
                <p>Bearbeite die Startseiten-Kacheln.</p>
              </div>
            </div>
            
            {!editingCategory ? (
              <div className="adminTableContainer">
                <table className="adminTablePremium">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Untertitel</th>
                      <th>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(c => (
                      <tr key={c.id}>
                        <td><strong>{c.name}</strong></td>
                        <td>{c.detail}</td>
                        <td>
                          <div className="tdActions">
                            <button className="iconBtn edit" onClick={() => handleEditCategory(c)}><Edit2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="adminEditorPremium">
                <div className="adminEditorHeader">
                  <h3>Kategorie bearbeiten: {editingCategory.name}</h3>
                  <div className="editorActions">
                    <button className="btnOutline" onClick={() => setEditingCategory(null)}>Abbrechen</button>
                    <button className="btnSolid" onClick={handleSaveCategory}><Save size={18} /> Speichern</button>
                  </div>
                </div>

                <div className="adminFormGrid">
                  <div className="formGroup fullWidth">
                    <label>Titel</label>
                    <input type="text" value={categoryData.name || ''} onChange={e => setCategoryData({...categoryData, name: e.target.value})} />
                  </div>
                  <div className="formGroup fullWidth">
                    <label>Untertitel</label>
                    <input type="text" value={categoryData.detail || ''} onChange={e => setCategoryData({...categoryData, detail: e.target.value})} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

          {/* INBOX TAB */}
          {activeTab === 'inbox' && (
            <div className="adminPanel">
              <div className="adminHeaderPremium">
                <h2>Posteingang (Kontaktformular)</h2>
              </div>
              {inboxMessages.length === 0 ? (
                <p style={{color: '#888', marginTop: '16px'}}>Keine neuen Nachrichten.</p>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px'}}>
                  {inboxMessages.map(msg => (
                    <div key={msg.id} style={{background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '20px'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px'}}>
                        <h3 style={{margin: 0, fontSize: '16px', color: '#fff'}}>{msg.subject}</h3>
                        <span style={{color: '#888', fontSize: '12px'}}>{new Date(msg.createdAt).toLocaleString('de-DE')}</span>
                      </div>
                      <p style={{margin: 0, color: '#ccc', lineHeight: '1.5', whiteSpace: 'pre-wrap'}}>{msg.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
      {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (() => {
          const totalViews = analyticsEvents.filter(e => e.event_type === 'page_view').length;
          const totalProductViews = analyticsEvents.filter(e => e.event_type === 'product_view').length;
          const totalCartAdds = analyticsEvents.filter(e => e.event_type === 'add_to_cart').length;
          const totalCheckouts = checkoutEvents.length;
          const uniqueSessions = new Set(analyticsEvents.map(e => e.session_id)).size;
          const avgOrderValue = checkoutEvents.length > 0
            ? (checkoutEvents.reduce((a, c) => a + parseFloat(c.total_value || '0'), 0) / checkoutEvents.length).toFixed(2)
            : '0.00';
          const avgItemsPerOrder = checkoutEvents.length > 0
            ? (checkoutEvents.reduce((a, c) => a + (c.item_count || 0), 0) / checkoutEvents.length).toFixed(1)
            : '0';

          // Material breakdown
          const cartMaterials = analyticsEvents.filter(e => e.event_type === 'add_to_cart' && e.material);
          const matCount = { gold: 0, silver: 0, platinum: 0, other: 0 };
          cartMaterials.forEach(e => {
            const m = (e.material || '').toLowerCase();
            if (m.includes('gold')) matCount.gold++;
            else if (m.includes('silber') || m.includes('silver')) matCount.silver++;
            else if (m.includes('platin')) matCount.platinum++;
            else matCount.other++;
          });
          const matTotal = Math.max(1, cartMaterials.length);
          const goldPct = Math.round(matCount.gold / matTotal * 100);
          const silverPct = Math.round(matCount.silver / matTotal * 100);
          const platinumPct = Math.round(matCount.platinum / matTotal * 100);
          const otherPct = 100 - goldPct - silverPct - platinumPct;

          // Top products
          const productViewMap: Record<string, number> = {};
          analyticsEvents.filter(e => e.event_type === 'product_view' && e.product_name).forEach(e => {
            productViewMap[e.product_name] = (productViewMap[e.product_name] || 0) + 1;
          });
          const topProducts = Object.entries(productViewMap).sort((a,b) => b[1]-a[1]).slice(0, 5);
          const maxViews = Math.max(1, ...topProducts.map(p => p[1]));

          // Recent events
          const recentEvents = analyticsEvents.slice(0, 8);

          return (
            <div className="adminPanel">
              <div className="adminHeaderPremium">
                <div><h2>Analytics</h2><p>Live-Daten aus deinem Shop.</p></div>
                <button onClick={async () => {
                  setAnalyticsLoading(true);
                  const [{ data: events }, { data: checkouts }] = await Promise.all([
                    supabase.from('analytics_events').select('*').order('created_at', { ascending: false }).limit(500),
                    supabase.from('checkout_events').select('*').order('created_at', { ascending: false }).limit(200),
                  ]);
                  if (events) setAnalyticsEvents(events);
                  if (checkouts) setCheckoutEvents(checkouts);
                  setAnalyticsLoading(false);
                }} className="btnSolid" style={{fontSize:'12px',padding:'8px 16px'}}>↻ Aktualisieren</button>
              </div>

              {analyticsLoading ? (
                <p style={{color:'#888', marginTop:'32px'}}>Lade Analytics-Daten...</p>
              ) : (
                <>
                  {/* KPI Cards */}
                  <div className="analyticsKpiGrid">
                    <div className="analyticsKpiCard">
                      <Eye size={20} className="kpiIcon" />
                      <div className="kpiValue">{uniqueSessions}</div>
                      <div className="kpiLabel">Unique Sessions</div>
                    </div>
                    <div className="analyticsKpiCard">
                      <TrendingUp size={20} className="kpiIcon" />
                      <div className="kpiValue">{totalProductViews}</div>
                      <div className="kpiLabel">Produkt-Aufrufe</div>
                    </div>
                    <div className="analyticsKpiCard">
                      <ShoppingCart size={20} className="kpiIcon" />
                      <div className="kpiValue">{totalCartAdds}</div>
                      <div className="kpiLabel">In den Warenkorb</div>
                    </div>
                    <div className="analyticsKpiCard highlight">
                      <BarChart2 size={20} className="kpiIcon" />
                      <div className="kpiValue">{totalCheckouts}</div>
                      <div className="kpiLabel">Checkouts</div>
                    </div>
                    <div className="analyticsKpiCard">
                      <div className="kpiValue">€{avgOrderValue}</div>
                      <div className="kpiLabel">Ø Bestellwert</div>
                    </div>
                    <div className="analyticsKpiCard">
                      <div className="kpiValue">{avgItemsPerOrder}</div>
                      <div className="kpiLabel">Ø Items/Order</div>
                    </div>
                  </div>

                  <div className="analyticsRow">
                    {/* Material Breakdown */}
                    <div className="analyticsCard">
                      <h3 className="analyticsCardTitle">Material Breakdown</h3>
                      <div className="materialBars">
                        {[
                          { label: 'Gold', pct: goldPct, color: '#f0c040' },
                          { label: 'Silber', pct: silverPct, color: '#c0c8d8' },
                          { label: 'Platin', pct: platinumPct, color: '#a8b4c8' },
                          { label: 'Sonstige', pct: otherPct, color: '#555' },
                        ].map(m => (
                          <div key={m.label} className="materialBarRow">
                            <span className="materialBarLabel">{m.label}</span>
                            <div className="materialBarTrack">
                              <div className="materialBarFill" style={{width: `${m.pct}%`, background: m.color}} />
                            </div>
                            <span className="materialBarPct">{m.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Products */}
                    <div className="analyticsCard">
                      <h3 className="analyticsCardTitle">Top Produkte</h3>
                      {topProducts.length === 0 ? (
                        <p style={{color:'#666', fontSize:'14px'}}>Noch keine Produktaufrufe.</p>
                      ) : (
                        <div className="topProductBars">
                          {topProducts.map(([name, views]) => (
                            <div key={name} className="topProductRow">
                              <span className="topProductName">{name}</span>
                              <div className="materialBarTrack">
                                <div className="materialBarFill" style={{width: `${Math.round(views/maxViews*100)}%`, background: '#78d8ff'}} />
                              </div>
                              <span className="materialBarPct">{views}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Checkouts */}
                  <div className="analyticsCard" style={{marginTop:'24px'}}>
                    <h3 className="analyticsCardTitle">Letzte Checkouts</h3>
                    {checkoutEvents.length === 0 ? (
                      <p style={{color:'#666',fontSize:'14px'}}>Noch keine Checkouts.</p>
                    ) : (
                      <table className="adminTablePremium" style={{marginTop:'12px'}}>
                        <thead><tr><th>Datum</th><th>Items</th><th>Gesamtwert</th><th>Produkte</th></tr></thead>
                        <tbody>
                          {checkoutEvents.slice(0,10).map((c, i) => (
                            <tr key={i}>
                              <td style={{fontSize:'12px', color:'#888'}}>{new Date(c.created_at).toLocaleString('de-DE')}</td>
                              <td>{c.item_count}</td>
                              <td><strong style={{color:'#78d8ff'}}>€{parseFloat(c.total_value||'0').toFixed(2)}</strong></td>
                              <td style={{fontSize:'12px', color:'#aaa'}}>{Array.isArray(c.items) ? c.items.map((it:any) => it.name).join(', ') : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Recent Activity */}
                  <div className="analyticsCard" style={{marginTop:'24px'}}>
                    <h3 className="analyticsCardTitle">Live Activity</h3>
                    <div style={{display:'flex', flexDirection:'column', gap:'8px', marginTop:'12px'}}>
                      {recentEvents.length === 0 ? (
                        <p style={{color:'#666',fontSize:'14px'}}>Noch keine Events.</p>
                      ) : recentEvents.map((e, i) => (
                        <div key={i} className="activityRow">
                          <span className={`activityDot ${e.event_type === 'add_to_cart' ? 'green' : e.event_type === 'product_view' ? 'blue' : 'gray'}`} />
                          <span className="activityType">{e.event_type.replace(/_/g,' ')}</span>
                          <span className="activityName">{e.product_name || '—'}</span>
                          <span className="activityTime">{new Date(e.created_at).toLocaleTimeString('de-DE')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })()}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="adminPanel">
          <div className="adminHeaderPremium">
            <div><h2>Accounts</h2><p>Alle registrierten Nutzer.</p></div>
          </div>
          {userProfiles.length === 0 ? (
            <p style={{color:'#888', marginTop:'24px'}}>Noch keine registrierten Nutzer.</p>
          ) : (
            <table className="adminTablePremium" style={{marginTop:'24px'}}>
              <thead><tr><th>Name</th><th>E-Mail</th><th>Registriert</th></tr></thead>
              <tbody>
                {userProfiles.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.display_name || '—'}</strong></td>
                    <td style={{color:'#aaa'}}>{u.email}</td>
                    <td style={{color:'#666', fontSize:'12px'}}>{new Date(u.created_at).toLocaleDateString('de-DE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CUSTOM REQUESTS TAB */}
      {activeTab === 'custom' && (
        <div className="adminPanel">
          <div className="adminHeaderPremium">
            <div><h2>Custom Anfragen</h2><p>Bilder und Beschreibungen von Kunden.</p></div>
          </div>
          {customRequests.length === 0 ? (
            <p style={{color:'#888', marginTop:'24px'}}>Noch keine Custom Anfragen.</p>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px'}}>
              {customRequests.map(req => (
                <div key={req.id} style={{background: '#111', border: '1px solid #333', borderRadius: '12px', padding: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap'}}>
                  {req.image_url && (
                    <div style={{flexShrink: 0, width: '200px', height: '200px', borderRadius: '8px', overflow: 'hidden', background: '#222'}}>
                      <img src={req.image_url} alt="Custom Request" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                    </div>
                  )}
                  <div style={{flex: 1, minWidth: '300px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px'}}>
                      <div>
                        <strong style={{color: '#78d8ff', display: 'block', fontSize: '14px', marginBottom: '4px'}}>{req.user_email}</strong>
                        <span style={{color: '#888', fontSize: '12px'}}>{new Date(req.created_at).toLocaleString('de-DE')}</span>
                      </div>
                      <span style={{background: req.status === 'neu' ? '#4caf50' : '#333', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700}}>{req.status}</span>
                    </div>
                    <p style={{color: '#ccc', lineHeight: '1.6', whiteSpace: 'pre-wrap', margin: 0, fontSize: '14px'}}>{req.description}</p>
                    
                    <div style={{marginTop: '20px', display: 'flex', gap: '12px'}}>
                      <button onClick={async () => {
                        const newStatus = req.status === 'neu' ? 'in_bearbeitung' : 'erledigt';
                        await supabase.from('custom_requests').update({status: newStatus}).eq('id', req.id);
                        setCustomRequests(prev => prev.map(r => r.id === req.id ? {...r, status: newStatus} : r));
                      }} style={{background: 'transparent', border: '1px solid #555', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px'}}>
                        Status ändern
                      </button>
                      {req.image_url && (
                        <a href={req.image_url} target="_blank" rel="noopener noreferrer" style={{background: '#222', border: '1px solid #333', color: '#fff', padding: '8px 16px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', display: 'inline-flex', alignItems: 'center'}}>
                          Bild groß ansehen
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      </div>
    </section>
  );
}
