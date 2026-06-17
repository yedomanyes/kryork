import React, { useState } from 'react';
import { ArrowLeft, Star, ShieldCheck, Truck, Clock, CheckCircle2, CreditCard } from 'lucide-react';
import './styles.css';

import { Product } from './types';

export default function ProductDetail({ product, onBack, lang, addToCart }: { product: Product, onBack: () => void, lang: 'de' | 'en', addToCart?: (p: Product) => void }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const isDe = lang === 'de';

  // Map product tone to a mockup image or use generic if not found
  const getProductImage = (tone: string) => {
    switch(tone) {
      case 'gold': return '/hauptcontainergroß.png';
      case 'gold-set': return '/hintergrund2backtround.png';
      case 'silver': return '/kleinercontainerobenrechts.png';
      case 'ring': return '/bannerhintergrund3.png';
      default: return '/hinterrgund1.png';
    }
  };

  const fallbackImages = [
    getProductImage(product.tone),
    '/icedoutding.png',
    '/banner4hintergrund.png'
  ];

  const galleryImages = product.images && product.images.length > 0 
    ? product.images 
    : fallbackImages;

  return (
    <div className="pdpContainer">
      <div className="pdpNav">
        <button onClick={onBack} className="backBtn">
          <ArrowLeft size={20} />
          <span>{isDe ? 'Zurück' : 'Back'}</span>
        </button>
      </div>

      <div className="pdpGrid">
        {/* Left: Image Gallery */}
        <div className="pdpGallery">
          <div className="pdpMainImage">
            <img src={galleryImages[activeImageIndex]} alt={product.name} />
          </div>
          <div className="pdpThumbnails">
            {galleryImages.map((src, idx) => (
              <div 
                key={idx} 
                className={`pdpThumb ${activeImageIndex === idx ? 'active' : ''}`}
                onClick={() => setActiveImageIndex(idx)}
              >
                <img src={src} alt={`Thumbnail ${idx + 1}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Conversion Info */}
        <div className="pdpInfo">
          <h1 className="pdpTitle">{product.name}</h1>
          <p className="pdpSubtitle">{product.material} • Premium Quality</p>

          <div className="pdpPriceBox">
            <div className="prices">
              <span className="currentPrice">{product.price}</span>
              <span className="oldPrice">{product.oldPrice}</span>
            </div>
            <div className="saveBadge">{product.off}</div>
          </div>

          <p className="pdpDescription">
            {product.description || (isDe 
              ? 'Handgefertigt in Deutschland. Wasserfest, anlaufgeschützt und besetzt mit den feinsten Steinen. Der ultimative Eye-Catcher, der nicht verblasst.'
              : 'Handcrafted in Germany. Waterproof, tarnish-free, and set with the finest stones. The ultimate eye-catcher that never fades.')}
          </p>

          <div className="pdpCtas">
            <button 
              className="btnPrimary huge"
              onClick={() => {
                if (addToCart) addToCart(product);
              }}
            >
              {isDe ? 'In den Warenkorb' : 'Add to Cart'}
            </button>
            <button className="btnExpress">
              <CreditCard size={20} />
              {isDe ? 'Direkt zur Kasse' : 'Buy it now'}
            </button>
          </div>


        </div>
      </div>
    </div>
  );
}
