import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ArrowRight, ArrowLeft, Bell, Search, ShoppingBag, UserRound, X, Sparkles, Truck, HeartHandshake, Coins, Box, Camera, Upload, Image as ImageIcon, Menu, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import './styles.css';
import CustomBuilder from './CustomBuilder';
import ProductDetail from './ProductDetail';
import AdminDashboard from './AdminDashboard';
import { Product, defaultProducts, Category, defaultCategories, InboxMessage } from './types';
import { supabase } from './supabase';
import { track, trackCheckout } from './analytics';

const gemImages = [
  { src: '/diamondroundcut.png', alt: 'Round Cut Diamond' },
  { src: '/emerald.png', alt: 'Emerald' },
  { src: '/opal.png', alt: 'Opal' },
  { src: '/aquamarine.png', alt: 'Aquamarine' },
  { src: '/bluediamomd.png', alt: 'Blue Diamond' },
  { src: '/pink%20dimaond.png', alt: 'Pink Diamond' },
  { src: '/yellowdiamond.png', alt: 'Yellow Diamond' },
  { src: '/tourmaline.png', alt: 'Tourmaline' },
  { src: '/morganite.png', alt: 'Morganite' },
  { src: '/blackopal.png', alt: 'Black Opal' },
  { src: '/rubin.png', alt: 'Rubin' },
  { src: '/tanzanite.png', alt: 'Tanzanite' },
  { src: '/saphire.png', alt: 'Saphire' },
];

const defaultInboxMessages: InboxMessage[] = [
  { id: 'm1', subject: 'Willkommen bei KRYORK', text: 'Dein Account ist bereit. Custom-Anfragen und Reservierungen landen später hier.', createdAt: Date.now(), read: false },
  { id: 'm2', subject: 'Versandstatus', text: 'Kostenloser Versand im DACH-Raum ist für deine Session aktiv.', createdAt: Date.now() - 86400000, read: false },
  { id: 'm3', subject: 'Drop 001', text: 'Neue Ketten, Armbänder und Ringe werden bald freigeschaltet.', createdAt: Date.now() - 172800000, read: false },
];

const reviews = [
  { name: 'Maximilian K.', rating: 5, text: 'Die Cuban Link Kette hat eine unglaubliche Haptik. Das 14k Gold glänzt extrem edel. Kundenservice war weltklasse.', date: 'Vor 2 Tagen' },
  { name: 'Elena R.', rating: 5, text: 'Custom Cast Ring bestellt. Meine Skizze wurde exakt so umgesetzt, wie ich es mir vorgestellt habe. Jeden Cent wert.', date: 'Vor 1 Woche' },
  { name: 'Jonas M.', rating: 5, text: 'Armband kam super schnell an. Passt perfekt und das Design ist ultra clean. Definitiv nicht mein letztes Piece.', date: 'Vor 2 Wochen' },
];

const faqItems = [
  {
    question: 'Wie lange dauert Produktion & Versand?',
    answer: 'Ready-to-ship Pieces gehen in der Regel innerhalb von 24–48 Stunden raus. Custom Pieces brauchen je nach Design ca. 10–21 Werktage, weil jedes Detail sauber gegossen, poliert und geprüft wird.',
  },
  {
    question: 'Kann ich mein Piece zurückgeben?',
    answer: 'Ungetragene Standard-Produkte kannst du innerhalb von 14 Tagen nach Ankunft zurückgeben. Individuelle Custom-Anfertigungen werden extra für dich produziert und können deshalb nicht zurückgegeben werden.',
  },
  {
    question: 'Repariert KRYORK kaputte Produkte?',
    answer: 'Ja. Schreib uns mit Foto und Bestellnummer. Kleine Anpassungen und Reparaturen prüfen wir individuell — bei Material- oder Produktionsfehlern natürlich bevorzugt.',
  },
  {
    question: 'Kann ich Silber in Echtgold bestellen?',
    answer: 'Ja. Viele Designs können wir in 925 Sterling Silber, vergoldet oder Echtgold umsetzen. Bei Custom-Anfragen bekommst du vorab eine klare Preis- und Materialempfehlung.',
  },
  {
    question: 'Wie läuft eine Custom-Anfrage ab?',
    answer: 'Du schickst Referenzen, Maße und Wunschmaterial. Wir prüfen Machbarkeit, machen ein Angebot und starten erst, wenn du Design, Preis und Timeline bestätigt hast.',
  },
];

const materialOptions = {
  silver: { label: '925 Sterling Silber', short: 'Silber', tone: 'silver', pricePerGram: 3.6, depositRate: 0.3 },
  gold14: { label: '14k Echtgold', short: '14k Gold', tone: 'gold', pricePerGram: 68, depositRate: 0.35 },
  gold18: { label: '18k Echtgold', short: '18k Gold', tone: 'goldDeep', pricePerGram: 88, depositRate: 0.4 },
  whiteGold: { label: 'Weißgold', short: 'Weißgold', tone: 'whiteGold', pricePerGram: 92, depositRate: 0.4 },
  platinum: { label: 'Platin 950', short: 'Platin', tone: 'platinum', pricePerGram: 54, depositRate: 0.45 },
};

type MaterialKey = keyof typeof materialOptions;
type PieceType = 'pendant' | 'ring' | 'bracelet' | 'chain';

const pieceOptions: Record<PieceType, { label: string; baseGrams: number; multiplier: number }> = {
  pendant: { label: 'Anhänger', baseGrams: 12, multiplier: 1 },
  ring: { label: 'Ring', baseGrams: 9, multiplier: 0.85 },
  bracelet: { label: 'Armband', baseGrams: 24, multiplier: 1.35 },
  chain: { label: 'Kette', baseGrams: 38, multiplier: 1.8 },
};

const formatEuro = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

const slugifyPrompt = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9äöüß]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 38) || 'custom-piece';

const generateAsciiStl = (name: string, width: number, height: number, depth: number) => {
  const w = width / 2;
  const h = height / 2;
  const d = depth / 2;
  const v = [
    [-w, -h, -d], [w, -h, -d], [w, h, -d], [-w, h, -d],
    [-w, -h, d], [w, -h, d], [w, h, d], [-w, h, d],
  ];
  const faces = [
    [0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6],
    [0, 4, 5], [0, 5, 1], [1, 5, 6], [1, 6, 2],
    [2, 6, 7], [2, 7, 3], [3, 7, 4], [3, 4, 0],
  ];
  const vertex = (i: number) => `      vertex ${v[i][0].toFixed(3)} ${v[i][1].toFixed(3)} ${v[i][2].toFixed(3)}`;
  return [`solid ${name}`, ...faces.flatMap((face) => [
    '  facet normal 0 0 0',
    '    outer loop',
    vertex(face[0]),
    vertex(face[1]),
    vertex(face[2]),
    '    endloop',
    '  endfacet',
  ]), `endsolid ${name}`].join('\n');
};

const randomShippingSeconds = () => {
  const days = 3 + Math.random() * 4;
  return Math.floor(days * 24 * 60 * 60);
};

const formatShippingTimer = (secondsLeft: number) => {
  const safeSeconds = Math.max(0, secondsLeft);
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${days} TAGE · ${String(hours).padStart(2, '0')} STD · ${String(minutes).padStart(2, '0')} MIN · ${String(seconds).padStart(2, '0')} SEK`;
};

function CategoryVisual({ tone }: { tone: string }) {
  return (
    <div className={`categoryVisual ${tone}`}>
      <div className="studioShape studioShapeOne" />
      <div className="studioShape studioShapeTwo" />
      <div className="metalObject" />
    </div>
  );
}

function ProductVisual({ tone }: { tone: string }) {
  return (
    <div className={`productVisualClean ${tone}`}>
      <span className="productChain" />
      <span className="productChain second" />
    </div>
  );
}

function GemMarquee({ soft = false, sway = false }: { soft?: boolean; sway?: boolean }) {
  const gemLoop = (loopId: string) => (
    <div className="gemMarqueeSet" aria-hidden={loopId !== 'first'}>
      {gemImages.map((gem) => (
        <div className="gemMarqueeItem" key={`${loopId}-${gem.src}`}>
          <img src={gem.src} alt={gem.alt} loading="eager" decoding="async" />
        </div>
      ))}
    </div>
  );

  return (
    <section className={`gemMarqueeSection ${soft ? 'soft' : ''} ${sway ? 'sway' : ''}`} aria-label="KRYORK Gemstones">
      <div className="gemMarqueeFade left" />
      <div className="gemMarqueeFade right" />
      <div className="gemMarqueeTrack">
        {gemLoop('first')}
        {!sway && gemLoop('second')}
      </div>
    </section>
  );
}

const translations = {
  de: {
    shop: "Shop",
    categories: "Kategorien",
    custom: "Custom",
    reviews: "Bewertungen",
    fair: "FAIR",
    schnell: "SCHNELL",
    bezahlbar: "BEZAHLBAR",
    heroSubtitle: "Exklusive Pieces mit kompromissloser Qualität, handveredelt in Deutschland.",
    heroCta: "Kollektion ansehen",
    categoriesTitle: "Unsere limitierten Drops",
    viewAll: "Alle ansehen",
    bestsellers: "Bestseller",
    customTitle: "Custom Cast",
    customSubtitle: "Bring eine Referenz. Wir machen daraus dein Piece.",
    customCta: "Custom starten",
    reviewsTitle: "Was unsere Kunden sagen",
    footerText: "Moderner Schmuck aus Deutschland: klare Pieces, Custom-Anfragen und faire Preise für den DACH-Raum.",
    privacy: "Datenschutz",
    terms: "Terms of Service",
    contact: "Kontakt",
  },
  en: {
    shop: "Shop",
    categories: "Categories",
    custom: "Custom",
    reviews: "Reviews",
    fair: "FAIR",
    schnell: "FAST",
    bezahlbar: "AFFORDABLE",
    heroSubtitle: "Exclusive pieces with uncompromising quality, handcrafted in Germany.",
    heroCta: "View Collection",
    categoriesTitle: "Our Limited Drops",
    viewAll: "View All",
    bestsellers: "Bestsellers",
    customTitle: "Custom Cast",
    customSubtitle: "Bring a reference. We make your custom piece.",
    customCta: "Start Custom",
    reviewsTitle: "What our customers say",
    footerText: "Modern jewelry from Germany: clean pieces, custom requests, and fair pricing.",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    contact: "Contact",
  }
};

const uspList = {
  de: [
    "KOSTENLOSER EXPRESSVERSAND DACH",
    "100% ECHTGOLD & 925 STERLING SILBER",
    "HANDGEFERTIGT IN DEUTSCHLAND",
    "14 TAGE RÜCKGABERECHT"
  ],
  en: [
    "FREE DACH EXPRESS SHIPPING",
    "100% SOLID GOLD & 925 STERLING SILVER",
    "HANDCRAFTED IN GERMANY",
    "14-DAY RETURNS"
  ]
};

function App() {
  const initialShippingSeconds = useMemo(() => randomShippingSeconds(), []);
  const [shippingSecondsLeft, setShippingSecondsLeft] = useState(initialShippingSeconds);
  const [cookieConsent, setCookieConsent] = useState<'accepted' | 'declined' | null>(() => {
    const saved = localStorage.getItem('kryork_cookie_consent');
    return (saved as 'accepted' | 'declined') || null;
  });
  const [activePage, setActivePage] = useState<'home' | 'customHub' | 'customUpload' | 'productDetail' | 'category' | 'adminDashboard' | 'impressum' | 'datenschutz' | 'terms' | 'widerruf'>('home');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [customImage, setCustomImage] = useState<File | null>(null);
  const [customDesc, setCustomDesc] = useState('');
  const [customStatus, setCustomStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' | 'info' } | null>(null);
  const showToast = (msg: string, type: 'error' | 'success' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };
  
  const [loginLoading, setLoginLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>(defaultProducts);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [dbReady, setDbReady] = useState(false);

  // Track page view on mount — only if consent given
  useEffect(() => {
    if (cookieConsent === 'accepted') {
      track('page_view', { page: 'home' });
    }
  }, [cookieConsent]);

  // Load from Supabase on mount
  useEffect(() => {
    async function loadData() {
      const { data: prods } = await supabase.from('products').select('*');
      const { data: cats } = await supabase.from('categories').select('*');
      if (prods && prods.length > 0) {
        setProducts(prods.map((p: any) => ({
          id: p.id, name: p.name, material: p.material,
          oldPrice: p.old_price, price: p.price, off: p.off,
          tone: p.tone, description: p.description, images: p.images || []
        })));
      }
      if (cats && cats.length > 0) {
        setCategories(cats.map((c: any) => ({
          id: c.id, name: c.name, detail: c.detail, tone: c.tone
        })));
      }
      setDbReady(true);
    }
    loadData();
  }, []);
  const [activeOverlay, setActiveOverlay] = useState<'login' | 'search' | 'inbox' | 'custom3D' | 'cart' | 'mobileMenu' | null>(null);
  
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);

  // Load inbox from Supabase
  useEffect(() => {
    supabase.from('inbox_messages').select('*').order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setInboxMessages(data.map((m: any) => ({
          id: m.id, subject: m.subject, text: m.text, createdAt: m.created_at, read: m.read
        })));
      });
  }, []);
  
  const [contactSubject, setContactSubject] = useState('');
  const [contactText, setContactText] = useState('');
  const [contactStatus, setContactStatus] = useState('');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactSubject.trim() || !contactText.trim()) {
      setContactStatus('Bitte fülle alle Felder aus.');
      return;
    }
    const lastSent = localStorage.getItem('kryork_last_contact');
    const now = Date.now();
    if (lastSent && now - parseInt(lastSent, 10) < 15000) {
      setContactStatus('Bitte warte 15 Sekunden vor der nächsten Nachricht.');
      return;
    }
    const newMessage = {
      id: 'msg-' + now,
      subject: contactSubject,
      text: contactText,
      created_at: now,
      read: false
    };
    const { error } = await supabase.from('inbox_messages').insert([newMessage]);
    if (!error) {
      setInboxMessages([{ ...newMessage, createdAt: now }, ...inboxMessages]);
      localStorage.setItem('kryork_last_contact', now.toString());
      setContactSubject('');
      setContactText('');
      setContactStatus('Nachricht erfolgreich gesendet!');
      setTimeout(() => setContactStatus(''), 5000);
    } else {
      setContactStatus('Fehler beim Senden. Bitte versuche es erneut.');
    }
  };
  
  const [cartItems, setCartItems] = useState<{product: Product, quantity: number}[]>(() => {
    const saved = localStorage.getItem('kryork_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('kryork_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const [query, setQuery] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Supabase session listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setLoggedInUser(session.user.email ?? null);
        supabase.from('admins').select('email').eq('email', session.user.email).single()
          .then(({ data }) => { if (data) setIsAdmin(true); });
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setLoggedInUser(session.user.email ?? null);
        supabase.from('admins').select('email').eq('email', session.user.email).single()
          .then(({ data }) => { if (data) setIsAdmin(true); else setIsAdmin(false); });
      } else {
        setLoggedInUser(null);
        setIsAdmin(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [uspIndex, setUspIndex] = useState(0);
  const [activeFaqIndex, setActiveFaqIndex] = useState(-1);
  const [lang, setLang] = useState<'de' | 'en'>(() => {
    if (typeof window !== 'undefined' && navigator.language) {
      return navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en';
    }
    return 'en';
  });
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('Iced Out Anhänger mit KRYORK Schriftzug, Cuban-Link Rahmen und blauem Center-Stone');
  const [customMaterial, setCustomMaterial] = useState<MaterialKey>('silver');

  const addToCart = (product: Product) => {
    if (cookieConsent === 'accepted') track('add_to_cart', { productId: product.id, productName: product.name, material: product.material });
    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setActiveOverlay('cart');
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };
  const [customPiece, setCustomPiece] = useState<PieceType>('pendant');
  const [customSize, setCustomSize] = useState(52);
  const [customStoneLevel, setCustomStoneLevel] = useState(2);

  const t = translations[lang];
  const selectedMaterial = materialOptions[customMaterial];
  const selectedPiece = pieceOptions[customPiece];
  const promptComplexity = Math.min(1.75, 1 + customPrompt.trim().length / 240 + customStoneLevel * 0.08);
  const estimatedGrams = Number((selectedPiece.baseGrams * selectedPiece.multiplier * (customSize / 50) * promptComplexity).toFixed(1));
  const stoneCost = customStoneLevel * 75 + (customPrompt.toLowerCase().includes('diamond') || customPrompt.toLowerCase().includes('diamant') ? 140 : 0);
  const laborCost = 180 + customStoneLevel * 55 + Math.round(customPrompt.trim().length * 1.35);
  const estimatedPrice = Math.round(estimatedGrams * selectedMaterial.pricePerGram + laborCost + stoneCost);
  const estimatedDeposit = Math.round(estimatedPrice * selectedMaterial.depositRate);
  const previewWords = customPrompt.trim().split(/\s+/).filter(Boolean).slice(0, 3).join(' ') || 'KRYORK';
  const stlDimensions = {
    width: Number((customSize / 2.2).toFixed(1)),
    height: Number((customSize / (customPiece === 'chain' ? 5 : 1.65)).toFixed(1)),
    depth: Number(Math.max(2.4, estimatedGrams / 7).toFixed(1)),
  };

  const downloadCustomStl = () => {
    const fileName = `kryork-${slugifyPrompt(customPrompt)}.stl`;
    const modelName = fileName.replace('.stl', '');
    const stl = generateAsciiStl(modelName, stlDimensions.width, stlDimensions.height, stlDimensions.depth);
    const blob = new Blob([
      `// KRYORK prototype STL\n// Prompt: ${customPrompt}\n// Material: ${selectedMaterial.label}\n// Estimated grams: ${estimatedGrams}g\n// Estimated price: ${formatEuro(estimatedPrice)}\n`,
      stl,
    ], { type: 'model/stl' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const searchResults = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();
    const allItems = [...categories, ...products];
    if (!searchTerm) return allItems.slice(0, 6);

    return allItems.filter((item) =>
      `${item.name} ${'detail' in item ? item.detail : item.material}`.toLowerCase().includes(searchTerm),
    );
  }, [query]);

  const collageRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    gemImages.forEach((gem) => {
      const image = new Image();
      image.src = gem.src;
    });
  }, []);

  useEffect(() => {
    const shippingInterval = window.setInterval(() => {
      setShippingSecondsLeft((current) => (current <= 0 ? randomShippingSeconds() : current - 1));
    }, 1000);

    const uspInterval = window.setInterval(() => {
      setUspIndex((prev) => (prev + 1) % 4);
    }, 3500);

    return () => {
      window.clearInterval(shippingInterval);
      window.clearInterval(uspInterval);
    };
  }, []);

  useEffect(() => {
    const slider = collageRef.current;
    if (!slider) return;

    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const handleMouseDown = (e: MouseEvent) => {
      isDown = true;
      slider.classList.add('active');
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    };

    const handleMouseLeave = () => {
      isDown = false;
      slider.classList.remove('active');
    };

    const handleMouseUp = () => {
      isDown = false;
      slider.classList.remove('active');
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.5; // Scroll multiplier speed
      slider.scrollLeft = scrollLeft - walk;
    };

    slider.addEventListener('mousedown', handleMouseDown);
    slider.addEventListener('mouseleave', handleMouseLeave);
    slider.addEventListener('mouseup', handleMouseUp);
    slider.addEventListener('mousemove', handleMouseMove);

    return () => {
      slider.removeEventListener('mousedown', handleMouseDown);
      slider.removeEventListener('mouseleave', handleMouseLeave);
      slider.removeEventListener('mouseup', handleMouseUp);
      slider.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const navigateToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setActivePage('home');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const openProductDetail = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    setLastScrollY(window.scrollY);
    setActiveProduct(product);
    setActivePage('productDetail');
    setTimeout(() => window.scrollTo(0, 0), 0);
  };

  const openCategory = (e: React.MouseEvent, category: Category) => {
    e.preventDefault();
    setLastScrollY(window.scrollY);
    setActiveCategory(category);
    setActivePage('category');
    setTimeout(() => window.scrollTo(0, 0), 0);
  };

  return (
    <main className="pageShell" id="top">
      <div className="topBar">
        <span className="uspTicker">{uspList[lang][uspIndex]}</span>
      </div>

      <header className="premiumNav">
        <a className="brandMark" href="#top" aria-label="KRYORK home" onClick={(event) => { event.preventDefault(); setActivePage('home'); }}>
          <span>KRYORK</span>
        </a>

        <nav className="navLinks desktopOnly" aria-label="KRYORK navigation">
          <a href="#shop" onClick={(e) => navigateToSection(e, 'shop')}>{t.shop}</a>
          <a href="#categories" onClick={(e) => navigateToSection(e, 'categories')}>{t.categories}</a>
          <a href="#custom" onClick={(event) => { event.preventDefault(); setActivePage('customHub'); }}>{t.custom}</a>
          <a href="#reviews" onClick={(e) => navigateToSection(e, 'reviews')}>{t.reviews}</a>
        </nav>
        
        <div className="navTools" style={{marginLeft: 'auto'}}>
          <div className="langSelectContainer desktopOnly">
            <select
              className="langSelect"
              value={lang}
              onChange={(e) => setLang(e.target.value as 'de' | 'en')}
              aria-label="Sprachauswahl"
            >
              <option value="de">DE</option>
              <option value="en">EN</option>
            </select>
          </div>

          <button aria-label="Search" onClick={() => setActiveOverlay('search')} className="desktopOnly"><Search size={24} /></button>
          
          <button aria-label="Account" onClick={() => setActiveOverlay('login')} className="desktopOnly"><UserRound size={24} /></button>
          
          <button aria-label="Account" onClick={() => setActiveOverlay('login')} className="mobileOnly" style={{background:'none',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center'}}><UserRound size={22} /></button>
          <button aria-label="Bag" className="cartBtn" onClick={() => setActiveOverlay('cart')}>
            <ShoppingBag size={24} />
            {cartItems.length > 0 && <span className="cartBadge">{cartItems.reduce((acc, item) => acc + item.quantity, 0)}</span>}
          </button>
          
          <button aria-label="Menu" className="mobileMenuBtn" onClick={() => setActiveOverlay('mobileMenu')}><Menu size={24} /></button>
        </div>
      </header>

      {activeOverlay === 'login' && (
        <section className="screenOverlay loginOverlay" aria-label="Login Screen" onClick={() => setActiveOverlay(null)}>
          <div className="authScreenSmall" onClick={(e) => e.stopPropagation()}>
            <button className="authCloseBtn" onClick={() => setActiveOverlay(null)} aria-label="Schließen"><X size={20} /></button>
            <div className="authCopySmall">
              <span>KRYORK ACCOUNT</span>
              <h2>{authMode === 'login' ? 'Willkommen zurück.' : 'Account erstellen.'}</h2>
            </div>
            {loggedInUser ? (
              <div className="authFormSmall">
                <p style={{color: '#555', margin: '0 0 12px 0', fontSize: '14px'}}>Eingeloggt als <strong style={{color:'#000'}}>{loggedInUser}</strong></p>
                {isAdmin && (
                  <button onClick={() => { setActiveOverlay(null); setActivePage('adminDashboard'); window.scrollTo(0,0); }} style={{background:'#000',color:'#fff',border:'none',padding:'12px 24px',fontWeight:700,cursor:'pointer',borderRadius:'6px',fontSize:'13px',marginBottom:'8px'}}>
                    Admin Dashboard öffnen
                  </button>
                )}
                <button onClick={async () => { await supabase.auth.signOut(); setLoggedInUser(null); setIsAdmin(false); }} style={{background:'transparent',color:'#000',border:'1px solid #ccc',padding:'10px 20px',cursor:'pointer',borderRadius:'6px',fontSize:'13px'}}>
                  Ausloggen
                </button>
              </div>
            ) : (
              <form className="authFormSmall" onSubmit={async (event) => {
                event.preventDefault();
                setLoginError('');
                setLoginLoading(true);
                try {
                  if (authMode === 'login') {
                    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
                    if (error) { setLoginError(error.message); return; }
                    if (data.user) {
                      const { data: adminData } = await supabase.from('admins').select('email').eq('email', data.user.email).single();
                      if (adminData) { setIsAdmin(true); setActiveOverlay(null); setActivePage('adminDashboard'); window.scrollTo(0,0); }
                      else { setActiveOverlay(null); }
                    }
                  } else {
                    const { error } = await supabase.auth.signUp({ email: loginEmail, password: loginPassword });
                    if (error) { setLoginError(error.message); return; }
                    setLoginError('Bestätigungs-E-Mail gesendet! Bitte E-Mail bestätigen.');
                  }
                } finally {
                  setLoginLoading(false);
                }
              }}>
                <label>E-Mail<input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="du@email.de" type="email" autoComplete="email" /></label>
                <label>
                  Passwort
                  <div className="passwordInputWrapper">
                    <input 
                      value={loginPassword} 
                      onChange={(event) => setLoginPassword(event.target.value)} 
                      placeholder="••••••••" 
                      type={showPassword ? "text" : "password"} 
                      autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} 
                    />
                    <button type="button" className="eyeBtn" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
                {loginError && <small style={{color: loginError.includes('gesendet') ? '#4caf50' : '#ff4444', display:'block', marginTop:'4px'}}>{loginError}</small>}
                <button type="submit" disabled={loginLoading} style={{opacity: loginLoading ? 0.6 : 1}}>
                  {loginLoading ? 'Bitte warten...' : (authMode === 'login' ? 'Einloggen' : 'Account erstellen')}
                </button>
                <small style={{cursor:'pointer', color:'#888', textAlign: 'center', marginTop: '12px', display: 'block'}} onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setLoginError(''); }}>
                  {authMode === 'login' ? 'Noch kein Account? Jetzt registrieren →' : '← Zurück zum Login'}
                </small>
              </form>
            )}
          </div>
        </section>
      )}

      {activeOverlay === 'search' && (
        <section className="screenOverlay compactOverlay" aria-label="Suche">
          <button className="overlayClose" onClick={() => setActiveOverlay(null)} aria-label="Schließen"><X size={22} /></button>
          <div className="searchScreen">
            <span>SUCHE</span>
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kette, Ring, Silber, Gold suchen..." />
            <div className="searchResults">
              {searchResults.map((item) => (
                <a href="#shop" onClick={() => setActiveOverlay(null)} key={item.name}>
                  <strong>{item.name}</strong>
                  <small>{'detail' in item ? item.detail : `${item.material} · ${item.price}`}</small>
                </a>
              ))}
              {searchResults.length === 0 && <p>Keine Ergebnisse gefunden.</p>}
            </div>
          </div>
        </section>
      )}

      {activeOverlay === 'inbox' && (
        <section className="screenOverlay compactOverlay" aria-label="Inbox">
          <button className="overlayClose" onClick={() => setActiveOverlay(null)} aria-label="Schließen"><X size={22} /></button>
          <div className="inboxScreen">
            <span>INBOX</span>
            <h2>Nachrichten</h2>
            <div className="messageList">
              {inboxMessages.map((message) => (
                <article key={message.id}>
                  <div><strong>{message.subject}</strong><small>{new Date(message.createdAt).toLocaleString('de-DE')}</small></div>
                  <p>{message.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {activePage === 'productDetail' && activeProduct && (
        <ProductDetail 
          product={activeProduct} 
          lang={lang} 
          addToCart={addToCart}
          onBack={() => {
            setActivePage('home');
            setTimeout(() => window.scrollTo(0, lastScrollY), 0);
          }} 
        />
      )}

      {activePage === 'customHub' && (
        <section className="customPageLayout">
          <div className="customMenuShell lightTheme">
            <div className="customMenuHeader">
              <h2>Wähle dein Custom Projekt</h2>
              <p>Wie möchtest du dein KRYORK Unikat kreieren?</p>
            </div>
            <div className="customMenuGrid">
              <div className="customMenuCard" onClick={() => setActivePage('customUpload')}>
                <div className="cmcIcon"><Camera size={32} /></div>
                <h3>Gesicht Foto ➔ Anhänger</h3>
                <p>Lade ein Portraitfoto hoch und wir wandeln es in einen massiven 3D Custom Anhänger um.</p>
              </div>
              <div className="customMenuCard" onClick={() => setActivePage('customUpload')}>
                <div className="cmcIcon"><ImageIcon size={32} /></div>
                <h3>Angespannter Arm ➔ Anhänger</h3>
                <p>Dein Flex als Iced Out Piece. Lade ein Bild deines Arms oder einer Pose hoch.</p>
              </div>
              <div className="customMenuCard" onClick={() => setActivePage('customUpload')}>
                <div className="cmcIcon"><Upload size={32} /></div>
                <h3>Logo / Skizze ➔ Piece</h3>
                <p>Lade dein Firmenlogo, Crew-Logo oder eine eigene Zeichnung für die Produktion hoch.</p>
              </div>
              <div className="customMenuCard" onClick={() => setActivePage('customUpload')}>
                <div className="cmcIcon"><Box size={32} /></div>
                <h3>Eigene Idee</h3>
                <p>Du hast eine ganz andere Vorstellung? Beschreibe sie uns und lade Referenzbilder hoch.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {activePage === 'customUpload' && (
        <section className="customPageLayout">
          <div className="customUploadShell lightTheme">
            <button className="backBtn" onClick={() => setActivePage('customHub')} aria-label="Zurück"><X size={20} /> Zurück</button>
            <h2>Deine Custom Anfrage</h2>
            <p>Lade hier dein Bild (Portrait, Logo, Pose) hoch und füge eine kurze Beschreibung hinzu. Wir prüfen die Machbarkeit und melden uns mit einem 3D CAD Vorschlag und Preis.</p>
            
            {customStatus === 'success' ? (
              <div style={{background: '#1a1a1a', padding: '24px', borderRadius: '12px', textAlign: 'center', marginTop: '24px'}}>
                <CheckCircle2 size={48} color="#4caf50" style={{marginBottom: '16px'}} />
                <h3>Anfrage erfolgreich gesendet!</h3>
                <p style={{color: '#888', marginTop: '8px'}}>Wir schauen uns deine Idee an und melden uns in Kürze bei dir.</p>
                <button onClick={() => setActivePage('home')} className="bannerBtn" style={{marginTop: '24px'}}>Zurück zum Shop</button>
              </div>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!loggedInUser) {
                  showToast('Bitte logge dich ein, um eine Custom Anfrage zu senden.', 'info');
                  setActiveOverlay('login');
                  return;
                }
                if (!customDesc.trim()) {
                  showToast('Bitte füge eine kurze Beschreibung hinzu.', 'error');
                  return;
                }

                // 5 Minute Rate Limit
                const lastSubmit = localStorage.getItem('kryork_last_custom_req');
                if (lastSubmit) {
                  const diff = Date.now() - parseInt(lastSubmit, 10);
                  if (diff < 5 * 60 * 1000) {
                    showToast('Du kannst nur alle 5 Minuten eine Anfrage senden. Bitte warte noch etwas.', 'error');
                    return;
                  }
                }
                
                setCustomStatus('loading');
                try {
                  let imageUrl = null;
                  if (customImage) {
                    const ext = customImage.name.split('.').pop();
                    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
                    const { data, error: uploadError } = await supabase.storage
                      .from('custom-uploads')
                      .upload(fileName, customImage);
                    
                    if (uploadError) throw uploadError;
                    
                    const { data: { publicUrl } } = supabase.storage
                      .from('custom-uploads')
                      .getPublicUrl(fileName);
                    
                    imageUrl = publicUrl;
                  }

                  const { error } = await supabase.from('custom_requests').insert([{
                    user_email: loggedInUser,
                    description: customDesc,
                    image_url: imageUrl
                  }]);

                  if (error) throw error;
                  localStorage.setItem('kryork_last_custom_req', Date.now().toString());
                  setCustomStatus('success');
                } catch (err) {
                  console.error(err);
                  showToast('Fehler beim Senden. Bitte versuche es später noch einmal.', 'error');
                  setCustomStatus('error');
                }
              }}>
                <div className="uploadDropzone" style={{ marginTop: '24px', position: 'relative' }}>
                  {customImage ? (
                    <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'12px'}}>
                      <img src={URL.createObjectURL(customImage)} alt="Preview" style={{maxHeight:'160px', borderRadius:'8px'}} />
                      <span style={{color:'#fff', fontWeight:600}}>{customImage.name}</span>
                      <button type="button" onClick={() => setCustomImage(null)} style={{background:'transparent', border:'1px solid #444', color:'#888', padding:'6px 12px', borderRadius:'4px', cursor:'pointer', fontSize:'12px'}}>Anderes Bild wählen</button>
                    </div>
                  ) : (
                    <>
                      <Upload size={48} className="uploadIcon" />
                      <span>Bild hochladen (optional)</span>
                      <input type="file" accept="image/*" className="uploadFileInput" onChange={(e) => setCustomImage(e.target.files?.[0] || null)} />
                    </>
                  )}
                </div>
                
                <textarea 
                  value={customDesc} 
                  onChange={(e) => setCustomDesc(e.target.value)} 
                  placeholder="Beschreibe deine Idee (Material, Größe, besondere Details)..."
                  style={{width: '100%', minHeight: '120px', background: '#111', border: '1px solid #333', color: '#fff', padding: '16px', borderRadius: '8px', marginTop: '24px', fontFamily: 'inherit', resize: 'vertical'}}
                />

                <button type="submit" disabled={customStatus === 'loading'} className="bannerBtn uploadBtn" style={{marginTop: '24px', opacity: customStatus === 'loading' ? 0.7 : 1}}>
                  {customStatus === 'loading' ? 'Wird gesendet...' : 'Anfrage Senden'}
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      {activeOverlay === 'custom3D' && (
        <CustomBuilder lang={lang} onClose={() => setActiveOverlay(null)} />
      )}

      {activePage === 'category' && activeCategory && (
        <section className="categoryPage">
          <div className="categoryPageHeader">
            <button className="backBtn" onClick={() => { setActivePage('home'); setTimeout(() => window.scrollTo(0, lastScrollY), 0); }}>
              <ArrowLeft size={18} /> Zurück
            </button>
            <div className="categoryPageTitle">
              <h2>{activeCategory.name}</h2>
              <p>{activeCategory.detail}</p>
            </div>
          </div>
          
          <div className="categoryLayout">
            <aside className="categorySidebar">
              <h3>Filter</h3>
              <div className="filterGroup">
                <h4>Material</h4>
                <label><input type="checkbox" /> 14k Gold</label>
                <label><input type="checkbox" /> 925 Silber</label>
                <label><input type="checkbox" /> Weißgold</label>
              </div>
              <div className="filterGroup">
                <h4>Style</h4>
                <label><input type="checkbox" /> Iced Out</label>
                <label><input type="checkbox" /> Plain</label>
                <label><input type="checkbox" /> Custom</label>
              </div>
              <div className="filterGroup">
                <h4>Preis</h4>
                <label><input type="radio" name="price" /> Unter €100</label>
                <label><input type="radio" name="price" /> €100 - €300</label>
                <label><input type="radio" name="price" /> Über €300</label>
              </div>
            </aside>
            
            <div className="categoryContent">
              <div className="categoryProductGrid">
                {products.map((product) => (
                  <a className="productCardClean" href="#shop" key={product.name} onClick={(e) => openProductDetail(e, product)} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="discountBadge">{product.off}</div>
                    {product.images && product.images.length > 0 ? (
                      <img src={product.images[0]} alt={product.name} className="productCardImg" loading="lazy" decoding="async" />
                    ) : (
                      <ProductVisual tone={product.tone} />
                    )}
                    <div className="productInfoClean">
                      <h3>{product.name}</h3>
                      <p>{product.material}</p>
                      <div className="priceLine">
                        <span className="priceOld">{product.oldPrice}</span>
                        <span className="priceNew">{product.price}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {activePage === 'adminDashboard' && (
        <section className="adminOverlay">
          <AdminDashboard 
            products={products} 
            setProducts={setProducts}
            categories={categories}
            setCategories={setCategories}
            inboxMessages={inboxMessages}
            onClose={() => setActivePage('home')}
          />
        </section>
      )}

      {activeOverlay === 'cart' && (
        <section className="screenOverlay rightDrawer" aria-label="Warenkorb" onClick={() => setActiveOverlay(null)}>
          <div className="drawerContent" onClick={(e) => e.stopPropagation()}>
            <div className="drawerHeader">
              <h2>Warenkorb</h2>
              <button className="drawerCloseBtn" onClick={() => setActiveOverlay(null)} aria-label="Schließen"><X size={22} /></button>
            </div>
            <div className="cartItemsList">
              {cartItems.length === 0 ? (
                <div className="emptyCart">Dein Warenkorb ist leer.</div>
              ) : (
                cartItems.map((item, idx) => {
                  const priceNum = parseFloat(item.product.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
                  return (
                    <div key={idx} className="cartItem">
                      <img src={(item.product.images && item.product.images.length > 0) ? item.product.images[0] : '/hauptcontainergroß.png'} alt={item.product.name} loading="lazy" decoding="async" />
                      <div className="cartItemInfo">
                        <h4>{item.product.name}</h4>
                        <p>{item.product.price}</p>
                        <div className="cartItemQty">Menge: {item.quantity}</div>
                      </div>
                      <button className="cartItemRemove" onClick={() => removeFromCart(item.product.id)}><X size={18} /></button>
                    </div>
                  );
                })
              )}
            </div>
            {cartItems.length > 0 && (
              <div className="cartFooter">
                <div className="cartTotal">
                  <span>Gesamtsumme:</span>
                  <span>{cartItems.reduce((acc, item) => acc + (parseFloat(item.product.price.replace(/[^0-9.,]/g, '').replace(',', '.')) * item.quantity), 0).toFixed(2)} €</span>
                </div>
                <button className="bannerBtn checkoutBtn" onClick={() => { if (cookieConsent === "accepted") trackCheckout(cartItems); }}>Zur Kasse</button>
              </div>
            )}
          </div>
        </section>
      )}

      {activeOverlay === 'mobileMenu' && (
        <section className="screenOverlay leftDrawer" aria-label="Mobile Navigation" onClick={() => setActiveOverlay(null)}>
          <div className="drawerContent" onClick={(e) => e.stopPropagation()}>
            <div className="drawerHeader">
              <h2>Menu</h2>
              <button className="drawerCloseBtn" onClick={() => setActiveOverlay(null)} aria-label="Schließen"><X size={22} /></button>
            </div>
            <nav className="mobileNavLinks">
              <a href="#shop" onClick={(e) => { setActiveOverlay(null); navigateToSection(e, 'shop'); }}>{t.shop}</a>
              <a href="#categories" onClick={(e) => { setActiveOverlay(null); navigateToSection(e, 'categories'); }}>{t.categories}</a>
              <a href="#custom" onClick={(event) => { event.preventDefault(); setActiveOverlay(null); setActivePage('customHub'); }}>{t.custom}</a>
              <a href="#reviews" onClick={(e) => { setActiveOverlay(null); navigateToSection(e, 'reviews'); }}>{t.reviews}</a>
              <div className="mobileLangSelect">
                <label>Sprache:</label>
                <select value={lang} onChange={(e) => setLang(e.target.value as 'de' | 'en')}>
                  <option value="de">DE</option>
                  <option value="en">EN</option>
                </select>
              </div>
              <a href="#account" onClick={(e) => { e.preventDefault(); setActiveOverlay('login'); }} style={{display: 'flex', alignItems: 'center', gap: '12px', marginTop: 'auto', paddingTop: '24px'}}>
                <UserRound size={24} /> Account / Einloggen
              </a>
            </nav>
          </div>
        </section>
      )}

      {activePage === 'impressum' && (
        <section className="impressumPage">
          <div className="impressumInner">
            <div className="impressumHeader">
              <button className="impressumBack" onClick={() => { setActivePage('home'); window.scrollTo(0,0); }}>
                ← Zurück
              </button>
              <h1 className="impressumTitle">Impressum</h1>
            </div>

            <div className="impressumGrid">
              <div className="impressumLegal">
                <div className="impressumBlock">
                  <span className="impressumLabel">Angaben gemäß § 5 TMG</span>
                  <p>Akim Gürel<br />Hauptstraße 82<br />74427 Fichtenberg<br />Deutschland</p>
                </div>
                <div className="impressumBlock">
                  <span className="impressumLabel">Kontakt</span>
                  <p>atelier@kryork.com</p>
                </div>
                <div className="impressumBlock">
                  <span className="impressumLabel">EU-Streitschlichtung</span>
                  <p>Plattform der EU-Kommission zur Online-Streitbeilegung:<br />
                    <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="impressumLink">ec.europa.eu/consumers/odr</a>
                  </p>
                </div>
                <div className="impressumBlock">
                  <span className="impressumLabel">Haftungsausschluss</span>
                  <p>Trotz sorgfältiger Kontrolle übernehmen wir keine Haftung für Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.</p>
                </div>
              </div>

              <div className="impressumContact">
                <span className="impressumLabel">Direktkontakt</span>
                <p className="impressumContactNote">Dein Anliegen — wir antworten innerhalb von 48 Stunden.</p>
                <form onSubmit={handleContactSubmit} className="impressumForm">
                  <div className="impressumField">
                    <label className="impressumFieldLabel">Betreff</label>
                    <input
                      type="text"
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      className="impressumInput"
                      placeholder="z. B. Bestellung, Custom-Anfrage..."
                    />
                  </div>
                  <div className="impressumField">
                    <label className="impressumFieldLabel">Nachricht</label>
                    <textarea
                      value={contactText}
                      onChange={(e) => setContactText(e.target.value)}
                      rows={5}
                      className="impressumInput impressumTextarea"
                      placeholder="Schreib uns, wir melden uns schnell..."
                    />
                  </div>
                  <button type="submit" className="impressumSendBtn">Absenden</button>
                  {contactStatus && (
                    <p className={contactStatus.includes('erfolgreich') ? 'impressumStatus ok' : 'impressumStatus err'}>
                      {contactStatus}
                    </p>
                  )}
                </form>
              </div>
            </div>
          </div>
        </section>
      )}

      {activePage === 'datenschutz' && (
        <section className="impressumPage">
          <div className="impressumInner">
            <div className="impressumHeader">
              <button className="impressumBack" onClick={() => { setActivePage('home'); window.scrollTo(0,0); }}>← Zurück</button>
              <h1 className="impressumTitle">Datenschutz</h1>
            </div>
            <div className="legalTextPage">
              <div className="legalSection">
                <span className="impressumLabel">1. Verantwortlicher</span>
                <p>Akim Gürel · Hauptstraße 82 · 74427 Fichtenberg · Deutschland<br />E-Mail: atelier@kryork.com</p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">2. Erhebung und Speicherung personenbezogener Daten</span>
                <p>Beim Besuch unserer Website werden automatisch Informationen allgemeiner Natur erfasst (Server-Log-Files): IP-Adresse, Datum und Uhrzeit des Zugriffs, Name und URL der abgerufenen Datei, verwendeter Browser sowie Betriebssystem. Diese Daten sind keiner bestimmten Person zuordenbar und werden nicht mit anderen Datenquellen zusammengeführt.</p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">3. Kontaktformular</span>
                <p>Wenn du uns über das Kontaktformular im Impressum eine Nachricht sendest, werden die angegebenen Daten (Betreff und Nachricht) lokal in deinem Browser gespeichert (localStorage) und an uns weitergeleitet. Die Daten werden ausschließlich zur Bearbeitung deines Anliegens genutzt und nicht an Dritte weitergegeben.</p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">4. Datenbank & Cloud-Speicherung</span>
                <p>KRYORK nutzt <strong>Supabase</strong> (Supabase Inc., San Francisco, USA) als Cloud-Datenbank. Dabei werden folgende Daten auf Supabase-Servern gespeichert: Produktkatalog und Kategorien, Kontaktnachrichten aus dem Kontaktformular, anonyme Nutzungsanalysen (Seitenaufrufe, Produktklicks, Warenkorb-Events) sowie Nutzeraccounts bei Registrierung. Supabase ist nach EU-Standardvertragsklauseln (SCC) zertifiziert. Mehr: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="impressumLink">supabase.com/privacy</a></p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">5. LocalStorage & Cookies</span>
                <p>Im Browser wird LocalStorage für folgende Zwecke verwendet: Speicherung des Warenkorbs (technisch notwendig, kein Opt-in erforderlich) sowie deine Cookie-Einwilligung. Es werden keine Tracking-Cookies von Drittanbietern (z. B. Google, Meta) gesetzt. Analytics-Tracking erfolgt nur nach ausdrücklicher Einwilligung über unser Cookie-Banner.</p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">6. Kontaktformular</span>
                <p>Nachrichten, die du über das Kontaktformular im Impressum sendest, werden in unserer Supabase-Datenbank gespeichert und ausschließlich zur Bearbeitung deines Anliegens genutzt. Du kannst jederzeit die Löschung deiner Nachricht verlangen: atelier@kryork.com</p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">7. Deine Rechte</span>
                <p>Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung deiner personenbezogenen Daten sowie das Recht auf Datenübertragbarkeit. Wende dich dazu jederzeit an: atelier@kryork.com. Du hast zudem das Recht, dich bei der zuständigen Datenschutzaufsichtsbehörde zu beschweren.</p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">8. Aktualität</span>
                <p>Diese Datenschutzerklärung ist aktuell gültig und hat den Stand Juni 2026. Durch die Weiterentwicklung unserer Website kann eine Anpassung erforderlich werden.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {activePage === 'terms' && (
        <section className="impressumPage">
          <div className="impressumInner">
            <div className="impressumHeader">
              <button className="impressumBack" onClick={() => { setActivePage('home'); window.scrollTo(0,0); }}>← Zurück</button>
              <h1 className="impressumTitle">AGB</h1>
            </div>
            <div className="legalTextPage">
              <div className="legalSection">
                <span className="impressumLabel">1. Geltungsbereich</span>
                <p>Diese Allgemeinen Geschäftsbedingungen gelten für alle Bestellungen, die über den Online-Shop KRYORK (kryork.com) getätigt werden. Betreiber ist Akim Gürel, Hauptstraße 82, 74427 Fichtenberg. Vertragspartner sind ausschließlich Verbraucher im Sinne des § 13 BGB.</p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">2. Vertragsschluss</span>
                <p>Die Präsentation der Produkte im Online-Shop stellt kein rechtlich bindendes Angebot dar. Durch Klicken auf „Zur Kasse" gibst du ein verbindliches Angebot ab. Der Vertrag kommt zustande, wenn wir deine Bestellung per E-Mail bestätigen. Wir behalten uns vor, Bestellungen abzulehnen.</p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">3. Preise & Zahlung</span>
                <p>Alle angegebenen Preise verstehen sich in Euro (€) inklusive der gesetzlichen Mehrwertsteuer. Die Zahlung erfolgt per Vorkasse, VISA, Mastercard, PayPal oder Klarna. Bei Custom-Pieces wird eine Anzahlung in Höhe von 30–45 % des Gesamtpreises fällig. Bestelldaten werden sicher in unserer Cloud-Datenbank (Supabase) gespeichert.</p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">4. Lieferung</span>
                <p>Standard-Pieces werden innerhalb von 24–48 Stunden nach Zahlungseingang versandt. Custom-Pieces haben eine Produktionszeit von ca. 10–21 Werktagen. Der Versand erfolgt versichert innerhalb Deutschlands, Österreichs und der Schweiz (DACH) kostenlos. Für internationale Lieferungen gelten gesonderte Konditionen.</p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">5. Widerruf & Rückgabe</span>
                <p>Du hast das Recht, innerhalb von 14 Tagen ohne Angabe von Gründen den Vertrag zu widerrufen. Ungetragene Standard-Produkte können zurückgesandt werden. Individuell angefertigte Custom-Pieces sind vom Widerrufsrecht ausgenommen (§ 312g Abs. 2 Nr. 1 BGB). Die Rücksendekosten trägt der Käufer.</p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">6. Gewährleistung</span>
                <p>Es gelten die gesetzlichen Gewährleistungsrechte. Bei Materialfehlern oder Produktionsmängeln, die innerhalb von 24 Monaten auftreten, tragen wir die Kosten für Reparatur oder Ersatz. Normale Gebrauchsspuren gelten nicht als Mangel.</p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">7. Eigentumsvorbehalt</span>
                <p>Die gelieferte Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.</p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">8. Datenspeicherung</span>
                <p>Bestellbezogene Daten (Warenkorb, Bestellwert, gekaufte Produkte) werden anonymisiert zu Analysezwecken in unserer Supabase-Datenbank gespeichert. Personenbezogene Zahlungsdaten werden ausschließlich vom jeweiligen Zahlungsdienstleister verarbeitet und nicht von KRYORK gespeichert.</p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">9. Anwendbares Recht</span>
                <p>Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist, sofern gesetzlich zulässig, Fichtenberg.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {activePage === 'widerruf' && (
        <section className="impressumPage">
          <div className="impressumInner">
            <div className="impressumHeader">
              <button className="impressumBack" onClick={() => { setActivePage('home'); window.scrollTo(0,0); }}>← Zurück</button>
              <h1 className="impressumTitle">Widerrufsrecht</h1>
            </div>
            <div className="legalTextPage">
              <div className="legalSection">
                <span className="impressumLabel">Widerrufsbelehrung</span>
                <p>Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem du oder ein von dir benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen hast.</p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">Ausübung des Widerrufsrechts</span>
                <p>Um dein Widerrufsrecht auszuüben, musst du uns — Akim Gürel, Hauptstraße 82, 74427 Fichtenberg, atelier@kryork.com — mittels einer eindeutigen Erklärung (z. B. eine E-Mail oder das Kontaktformular im Impressum) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafür das nachstehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.</p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">Muster-Widerrufsformular</span>
                <p>
                  An: Akim Gürel, Hauptstraße 82, 74427 Fichtenberg, atelier@kryork.com<br /><br />
                  Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*):<br /><br />
                  — Bestellt am (*): _______________<br />
                  — Erhalten am (*): _______________<br />
                  — Name des/der Verbraucher(s): _______________<br />
                  — Anschrift des/der Verbraucher(s): _______________<br />
                  — Unterschrift (nur bei Mitteilung auf Papier): _______________<br />
                  — Datum: _______________<br /><br />
                  (*) Unzutreffendes streichen.
                </p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">Folgen des Widerrufs</span>
                <p>Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass du eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt hast), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über deinen Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen Transaktion eingesetzt hast, es sei denn, mit dir wurde ausdrücklich etwas anderes vereinbart.</p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">Rücksendung</span>
                <p>Du hast die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem du uns über den Widerruf dieses Vertrags unterrichtest, an uns zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn du die Waren vor Ablauf der Frist von vierzehn Tagen absendest. Die Kosten der Rücksendung der Waren trägt der Käufer.</p>
              </div>
              <div className="legalSection">
                <span className="impressumLabel">Ausschluss des Widerrufsrechts</span>
                <p>Das Widerrufsrecht besteht nicht bei Verträgen zur Lieferung von Waren, die nicht vorgefertigt sind und für deren Herstellung eine individuelle Auswahl oder Bestimmung durch den Verbraucher maßgeblich ist oder die eindeutig auf die persönlichen Bedürfnisse des Verbrauchers zugeschnitten sind (§ 312g Abs. 2 Nr. 1 BGB). Dies betrifft alle Custom-Pieces und Sonderanfertigungen von KRYORK.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {activePage === 'home' && (
        <>
          <section className="modernHeroBanner" aria-label="KRYORK Banner">
            <div className="heroBannerSingle">
              <img src="/hintergrund2backtround.png" alt="KRYORK Custom Jewellery" loading="eager" fetchPriority="high" decoding="sync" />
              <div className="heroBannerOverlay">
                <h1 className="heroBannerTitle">KRYORK</h1>
                <p className="heroBannerSub">Custom Jewellery Atelier</p>
                <a href="#shop" className="heroBannerCta" onClick={(e) => { e.preventDefault(); document.getElementById('shop')?.scrollIntoView({behavior:'smooth'}); }}>Jetzt entdecken</a>
              </div>
            </div>
          </section>

      {/* Trust USP Bar inspired by LabGems */}
      <section className="uspBar">
        <div className="uspItem">
          <Sparkles size={24} />
          <div>
            <strong>{lang === 'de' ? 'Handgefertigt' : 'Handcrafted'}</strong>
            <span>{lang === 'de' ? 'Atelier in Deutschland' : 'Atelier in Germany'}</span>
          </div>
        </div>
        <div className="uspDivider" />
        <div className="uspItem">
          <Truck size={24} />
          <div>
            <strong>{lang === 'de' ? 'Schneller Versand' : 'Fast Shipping'}</strong>
            <span>{lang === 'de' ? 'Kostenlos im DACH-Raum' : 'Free in DACH region'}</span>
          </div>
        </div>
        <div className="uspDivider" />
        <div className="uspItem">
          <HeartHandshake size={24} />
          <div>
            <strong>{lang === 'de' ? '100% Konfliktfrei' : '100% Conflict Free'}</strong>
            <span>{lang === 'de' ? 'Zertifizierte Materialien' : 'Certified materials'}</span>
          </div>
        </div>
        <div className="uspDivider" />
        <div className="uspItem">
          <Coins size={24} />
          <div>
            <strong>{lang === 'de' ? 'Faire Preise' : 'Fair Pricing'}</strong>
            <span>{lang === 'de' ? 'Ohne Zwischenhändler' : 'Direct to consumer'}</span>
          </div>
        </div>
      </section>

      {/* Lookbook Collage Bar inspired by LabGems */}
      <section className="collageSection">
        <div className="collageGrid" ref={collageRef}>
          <div className="collageCard">
            <img src="/hinterrgund1.png" alt="Chains Collection" loading="lazy" decoding="async" />
            <div className="collageLabel">{lang === 'de' ? 'Ketten' : 'Chains'}</div>
          </div>
          <div className="collageCard">
            <img src="/hintergrund2backtround.png" alt="Bracelets Collection" loading="lazy" decoding="async" />
            <div className="collageLabel">{lang === 'de' ? 'Armbänder' : 'Bracelets'}</div>
          </div>
          <div className="collageCard">
            <img src="/bannerhintergrund3.png" alt="Rings Collection" loading="lazy" decoding="async" />
            <div className="collageLabel">{lang === 'de' ? 'Ringe' : 'Rings'}</div>
          </div>
          <div className="collageCard">
            <img src="/icedoutding.png" alt="Pendants Collection" loading="lazy" decoding="async" />
            <div className="collageLabel">{lang === 'de' ? 'Anhänger' : 'Pendants'}</div>
          </div>
          <div className="collageCard">
            <img src="/banner4hintergrund.png" alt="Iced Out Collection" loading="lazy" decoding="async" />
            <div className="collageLabel">Iced Out</div>
          </div>
        </div>
      </section>

      <section id="categories" className="categorySection">
        <div className="categoryHeader">
          <h2>{t.categoriesTitle}</h2>
        </div>
        <div className="categoryGrid">
          {categories.map((category) => (
            <a className="categoryCard" href="#shop" key={category.name} onClick={(e) => openCategory(e, category)}>
              <CategoryVisual tone={category.tone} />
              <div className="categoryOverlay" />
              <div className="categoryCopy">
                <div>
                  <h3>{category.name}</h3>
                  <p>{category.detail}</p>
                </div>
                <span className="roundArrow"><ArrowRight size={28} /></span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section id="shop" className="shopSection">
        <div className="sectionHeadClean">
          <h2>{t.bestsellers}</h2>
          <div className="carouselControls">
            <button disabled>←</button>
            <button>→</button>
          </div>
        </div>
        <div className="productGridClean">
          {products.map((product) => (
            <a className="productCardClean" href="#shop" key={product.name} onClick={(e) => openProductDetail(e, product)} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="discountBadge">{product.off}</div>
              {product.images && product.images.length > 0 ? (
                <img src={product.images[0]} alt={product.name} className="productCardImg" />
              ) : (
                <ProductVisual tone={product.tone} />
              )}
              <div className="materialLine"><span />{product.material}</div>
              <h3>{product.name}</h3>
              <p><s>{product.oldPrice}</s> <strong>{product.price}</strong></p>
            </a>
          ))}
        </div>
      </section>

      <section id="reviews" className="reviewsSection">
        <div className="reviewsHeader">
          <span>KRYORK REVIEWS</span>
          <h2>{t.reviewsTitle}</h2>
        </div>
        <div className="reviewsGrid">
          {reviews.map((review, idx) => (
            <div className="reviewCard" key={idx}>
              <div className="reviewStars">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <span key={i} className="star">★</span>
                ))}
              </div>
              <p className="reviewText">"{review.text}"</p>
              <div className="reviewMeta">
                <strong>{review.name}</strong>
                <small>{review.date}</small>
              </div>
            </div>
          ))}
        </div>
      </section>


      <section className="faqSection" id="faq">
        <GemMarquee soft sway />
        <div className="faqShell" aria-label="Häufig gestellte Fragen">
          <h2>Meist gestellte Fragen</h2>
          <p className="faqLead">Kurz, sauber und direkt: Versand, Rückgabe, Reparatur, Echtgold und Custom Pieces.</p>
          <div className="faqList">
            {faqItems.map((item, index) => (
              <details className="faqItem" key={item.question} open={activeFaqIndex === index}>
                <summary
                  onClick={(event) => {
                    event.preventDefault();
                    setActiveFaqIndex((current) => (current === index ? -1 : index));
                  }}
                >
                  <span>{item.question}</span>
                  <b>+</b>
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
          <a className="faqMiniSupport" href="https://t.me/kryork" target="_blank" rel="noopener noreferrer">
            Noch offen? Support öffnen <ArrowRight size={16} />
          </a>
        </div>
      </section>
      </>
      )}


      <footer className="siteFooter">
        <div className="footerLeft">
          <strong>KRYORK</strong>
          <p>
            {t.footerText}
          </p>
          <div className="paymentMethods" aria-label="Zahlungsmethoden">
            <span className="payBadge klarna">Klarna</span>
            <span className="payBadge paypal"><span>Pay</span><span>Pal</span></span>
            <span className="payBadge bank">Überweisung</span>
            <span className="payBadge visa">VISA</span>
            <span className="payBadge mastercard"><span />Mastercard</span>
            <span className="payBadge amex">AMEX</span>
          </div>
        </div>
        <div className="footerRight">
          <a href="#datenschutz" onClick={(e) => { e.preventDefault(); setActivePage('datenschutz'); window.scrollTo(0,0); }}>Datenschutz</a>
          <a href="#impressum" onClick={(e) => { e.preventDefault(); setActivePage('impressum'); window.scrollTo(0,0); }}>Impressum</a>
          <a href="#terms" onClick={(e) => { e.preventDefault(); setActivePage('terms'); window.scrollTo(0,0); }}>AGB</a>
          <a href="#widerruf" onClick={(e) => { e.preventDefault(); setActivePage('widerruf'); window.scrollTo(0,0); }}>Widerrufsrecht</a>
        </div>
      </footer>

      {/* Cookie Consent Banner */}
      {cookieConsent === null && (
        <div className="cookieBanner">
          <div className="cookieBannerInner">
            <div className="cookieBannerText">
              <strong>Wir verwenden Cookies & LocalStorage</strong>
              <p>Für den Warenkorb und anonyme Nutzungsanalysen. Keine Werbecookies, keine Drittanbieter. <button className="cookieLink" onClick={() => { setActivePage('datenschutz'); window.scrollTo(0,0); }}>Mehr erfahren</button></p>
            </div>
            <div className="cookieBannerActions">
              <button className="cookieBtnDecline" onClick={() => { setCookieConsent('declined'); localStorage.setItem('kryork_cookie_consent', 'declined'); }}>Nur notwendige</button>
              <button className="cookieBtnAccept" onClick={() => { setCookieConsent('accepted'); localStorage.setItem('kryork_cookie_consent', 'accepted'); }}>Alle akzeptieren</button>
            </div>
          </div>
        </div>
      )}

      {/* Telegram Floating Button */}
      <a href="https://t.me/kryork" className="telegramFloating" target="_blank" rel="noopener noreferrer" aria-label="Chat on Telegram">
        <svg viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg">
          <path d="M9.78 18.65l.28-4.23 7.68-6.94c.33-.3-.07-.46-.51-.17L7.74 13.3 3.64 12c-.89-.28-.91-.89.19-1.32L21.89 3.86c.84-.31 1.57.19 1.29 1.34l-3.07 14.47c-.23 1.1-.89 1.37-1.81.86l-4.67-3.44-2.25 2.16c-.25.25-.46.46-.91.46z" fill="#ffffff" />
        </svg>
      </a>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999999,
          background: toast.type === 'error' ? '#1a0000' : toast.type === 'success' ? '#001a06' : '#0a0a14',
          color: toast.type === 'error' ? '#ff6b6b' : toast.type === 'success' ? '#4caf50' : '#78d8ff',
          border: `1px solid ${toast.type === 'error' ? '#ff4444' : toast.type === 'success' ? '#4caf50' : '#78d8ff'}`,
          padding: '14px 24px',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: 600,
          maxWidth: '90vw',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'slideInRight 0.3s ease',
          pointerEvents: 'none',
        }}>
          {toast.msg}
        </div>
      )}

    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
