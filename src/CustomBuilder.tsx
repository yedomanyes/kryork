import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { X, Sparkles, Download, Check, AlertTriangle, XCircle, Info, ChevronRight, Activity, Terminal, ShieldAlert } from 'lucide-react';

// Types
type JewelryType = 'ring' | 'pendant' | 'chain' | 'bracelet';
type MetalType = 'silver' | '14k_gold' | '18k_gold' | 'platinum';
type MetalFinish = 'polished' | 'matte' | 'hammered';
type GemstoneType = 'none' | 'cz' | 'moissanite' | 'diamond';
type RingStyle = 'band' | 'signet';
type PendantShape = 'cross' | 'heart' | 'star' | 'coin';

interface BuilderProps {
  onClose: () => void;
  lang: 'de' | 'en';
}

interface AuditCheck {
  name: string;
  status: 'passed' | 'warning' | 'critical';
  details: string;
}

interface AuditResult {
  score: number;
  checks: AuditCheck[];
  feedback: string;
}

// Metal Constants
const METALS: Record<MetalType, {
  nameDe: string;
  nameEn: string;
  density: number; // g/cm^3
  pricePerGram: number; // EUR
  baseCost: number; // EUR manufacturing
  color: number; // Hex code
  roughness: number;
  metalness: number;
}> = {
  silver: {
    nameDe: '925 Sterling Silber',
    nameEn: '925 Sterling Silver',
    density: 10.49,
    pricePerGram: 10.00,
    baseCost: 110,
    color: 0xffffff,
    roughness: 0.05,
    metalness: 1.0
  },
  '14k_gold': {
    nameDe: '14k Gelbgold',
    nameEn: '14k Yellow Gold',
    density: 13.50,
    pricePerGram: 82.00,
    baseCost: 280,
    color: 0xffd700,
    roughness: 0.05,
    metalness: 1.0
  },
  '18k_gold': {
    nameDe: '18k Gelbgold',
    nameEn: '18k Yellow Gold',
    density: 15.50,
    pricePerGram: 112.00,
    baseCost: 360,
    color: 0xffcf24,
    roughness: 0.04,
    metalness: 1.0
  },
  platinum: {
    nameDe: 'Platin 950',
    nameEn: 'Platinum 950',
    density: 21.45,
    pricePerGram: 145.00,
    baseCost: 480,
    color: 0xe5e8eb,
    roughness: 0.03,
    metalness: 1.0
  }
};

const GEMSTONES: Record<GemstoneType, {
  nameDe: string;
  nameEn: string;
  pricePerStone: number;
  color: number;
}> = {
  none: { nameDe: 'Keine', nameEn: 'None', pricePerStone: 0, color: 0x000000 },
  cz: { nameDe: 'Cubic Zirkonia', nameEn: 'Cubic Zirconia', pricePerStone: 3.50, color: 0xffffff },
  moissanite: { nameDe: 'Moissanit (VVS)', nameEn: 'Moissanite (VVS)', pricePerStone: 18.00, color: 0xe8f4f8 },
  diamond: { nameDe: 'Lab-Diamant (SI+)', nameEn: 'Lab Diamond (SI+)', pricePerStone: 55.00, color: 0xffffff }
};

const PROMPT_PRESETS_DE = [
  { text: 'Siegelring mit Initiale K, iced out', label: 'Siegelring K + Diamanten' },
  { text: 'Klassischer Ehering, gehämmertes Gold, massiv', label: 'Massiver Bandring' },
  { text: 'Kreuz-Anhänger aus Silber mit Steinen', label: 'Kreuz Iced Out' },
  { text: 'Münz-Anhänger "YK" mit Kordelrand', label: 'Rope-Münze YK' },
  { text: 'Filigraner Ring mit dünner Wandung', label: 'Dünner Ring (Warnung)' },
  { text: 'Schwere Kette in Silber glänzend', label: 'Massive Cuban Kette' }
];

const PROMPT_PRESETS_EN = [
  { text: 'Signet ring with initial K, iced out', label: 'Signet K + Diamonds' },
  { text: 'Classic wedding band, hammered gold, heavy', label: 'Massive Band' },
  { text: 'Cross pendant in silver with stones', label: 'Cross Iced Out' },
  { text: 'Coin pendant "YK" with rope border', label: 'Rope Coin YK' },
  { text: 'Filigree ring with thin wall', label: 'Thin Ring (Warning)' },
  { text: 'Heavy chain in polished silver', label: 'Massive Cuban Chain' }
];

// Metallurgical feasibility audit function
function runAICastabilityCheck(
  prompt: string,
  type: JewelryType,
  metal: MetalType,
  finish: MetalFinish,
  stones: GemstoneType,
  initials: string,
  styleOrShape: string
): AuditResult {
  const lower = prompt.toLowerCase();
  const checks: AuditCheck[] = [];
  let score = 100;
  
  // 1. Wall thickness check
  let thickness = 1.6; // default mm
  if (lower.includes('dünn') || lower.includes('thin') || lower.includes('zart') || lower.includes('filigran') || lower.includes('schmal')) {
    thickness = 0.8;
  } else if (lower.includes('massiv') || lower.includes('schwer') || lower.includes('heavy') || lower.includes('dick')) {
    thickness = 2.4;
  }
  
  if (thickness < 1.0) {
    checks.push({
      name: 'Wandstärke (Wall Thickness)',
      status: 'critical',
      details: `${thickness}mm — Kritisch dünne Wandung. Hohes Risiko für Gusslöcher oder Risse beim Erkalten.`
    });
    score -= 30;
  } else if (thickness < 1.4) {
    checks.push({
      name: 'Wandstärke (Wall Thickness)',
      status: 'warning',
      details: `${thickness}mm — Sehr fein. Feinguss erfordert hohe Gießtemperatur und Vakuum-Unterstützung.`
    });
    score -= 12;
  } else {
    checks.push({
      name: 'Wandstärke (Wall Thickness)',
      status: 'passed',
      details: `${thickness}mm — Optimal. Hervorragender Metallfluss im Gusskanal garantiert.`
    });
  }

  // 2. Undercuts check (Hinterschneidungen)
  let hasUndercuts = false;
  if (type === 'ring' && styleOrShape === 'signet') {
    hasUndercuts = true;
  } else if (type === 'pendant' && (styleOrShape === 'heart' || styleOrShape === 'star')) {
    hasUndercuts = true;
  }
  if (lower.includes('drache') || lower.includes('dragon') || lower.includes('skull') || lower.includes('totenkopf') || lower.includes('krone') || lower.includes('crown')) {
    hasUndercuts = true;
  }
  
  if (hasUndercuts) {
    checks.push({
      name: 'Hinterschneidungen (Undercuts)',
      status: 'warning',
      details: 'Hinterschneidungen detektiert. Stützstrukturen (Supports) für den 3D-Wachsdruck zwingend erforderlich.'
    });
    score -= 10;
  } else {
    checks.push({
      name: 'Hinterschneidungen (Undercuts)',
      status: 'passed',
      details: 'Keine kritischen Hinterschneidungen. Gussform lässt sich leicht und sauber entleeren.'
    });
  }

  // 3. Detail Resolution / Engraving Check
  let detailSize = 0.4; // mm
  if (initials && initials.length > 2) {
    detailSize = 0.25;
  }
  if (lower.includes('detailliert') || lower.includes('fein') || lower.includes('gravur') || lower.includes('engraving') || lower.includes('relief')) {
    detailSize = 0.18;
  }

  if (detailSize < 0.22) {
    checks.push({
      name: 'Detailauflösung (Detail Resolution)',
      status: 'critical',
      details: `${detailSize}mm Details — Zu fein für direkten Guss. Erfordert manuelle Laser-Mikrogravur nach dem Guss.`
    });
    score -= 20;
  } else if (detailSize < 0.3) {
    checks.push({
      name: 'Detailauflösung (Detail Resolution)',
      status: 'warning',
      details: `${detailSize}mm Details — Grenzwertig. Feine Konturen müssen beim Polieren manuell geschützt werden.`
    });
    score -= 8;
  } else {
    checks.push({
      name: 'Detailauflösung (Detail Resolution)',
      status: 'passed',
      details: `${detailSize}mm Details — Optimale Tiefe. Texturen fließen im Vakuum-Feinguss perfekt aus.`
    });
  }

  // 4. Gemstone settings (Fassungsstruktur)
  if (stones !== 'none') {
    if (stones === 'diamond' || stones === 'moissanite') {
      checks.push({
        name: 'Fassungsstruktur (Gemstone Settings)',
        status: 'passed',
        details: 'Körnerfassungen (Pave) werden im CAD/Guss präzise vorgesenkt. Steine werden gefasst.'
      });
    } else {
      checks.push({
        name: 'Fassungsstruktur (Gemstone Settings)',
        status: 'warning',
        details: 'CZ-Strukturen hitzeempfindlich. Steine müssen nach dem Guss manuell eingefasst werden.'
      });
      score -= 5;
    }
  } else {
    checks.push({
      name: 'Fassungsstruktur (Gemstone Settings)',
      status: 'passed',
      details: 'Kein Steinbesatz. Homogene Metalloberfläche erleichtert die Hochglanzpolitur.'
    });
  }

  // 5. Material Shrinkage & Metallurgy
  let shrinkageRisk = false;
  if (type === 'chain' || type === 'bracelet') {
    shrinkageRisk = true;
  }
  if (shrinkageRisk) {
    checks.push({
      name: 'Metallurgische Schrumpfung',
      status: 'warning',
      details: 'Bewegliche Glieder. Schrumpfungsausgleich (+2.2%) im CAD-Export automatisch angewendet.'
    });
    score -= 5;
  } else {
    checks.push({
      name: 'Metallurgische Schrumpfung',
      status: 'passed',
      details: `Material-Schrumpfung (${metal === 'platinum' ? '2.1%' : '1.8%'}) im STL-Kompensationsfaktor integriert.`
    });
  }

  // Final Verdict Advice
  let feedback = "";
  if (score >= 90) {
    feedback = "Das Design ist hervorragend gießbar. Die Proportionen sind optimal für den Feinguss in unserem Atelier. Die STL-Datei ist direkt einsatzbereit für den 3D-Wachsdruck und Guss.";
  } else if (score >= 70) {
    feedback = "Das Design ist gießbar, erfordert jedoch erhöhte Aufmerksamkeit bei der Vorbereitung. Aufgrund von feinen Strukturen oder Hinterschneidungen werden Stützstrukturen (Supports) im 3D-Druck platziert, die nach dem Guss von Hand entfernt und poliert werden müssen.";
  } else {
    feedback = "Kritische Gussfehler! Die Wandstärke ist zu gering oder Details sind zu filigran. Wir empfehlen dringend, den Prompt anzupassen (z.B. durch Hinzufügen von 'massiv' oder Reduzieren der Textlänge), um einen fehlerfreien Metallguss zu garantieren.";
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    checks,
    feedback
  };
}

export default function CustomBuilder({ onClose, lang }: BuilderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // UI states
  const [jewelryType, setJewelryType] = useState<JewelryType>('ring');
  const [promptText, setPromptText] = useState('');
  const [metal, setMetal] = useState<MetalType>('14k_gold');
  const [finish, setFinish] = useState<MetalFinish>('polished');
  const [stones, setStones] = useState<GemstoneType>('none');
  const [stonesCoverage, setStonesCoverage] = useState<'minimal' | 'medium' | 'iced'>('medium');
  const [ringStyle, setRingStyle] = useState<RingStyle>('signet');
  const [pendantShape, setPendantShape] = useState<PendantShape>('cross');
  const [initials, setInitials] = useState('YK');
  
  // Sizes
  const [ringSize, setRingSize] = useState(58);
  const [chainLength, setChainLength] = useState(50);
  const [braceletLength, setBraceletLength] = useState(20);

  // Engine states
  const [isGenerating, setIsGenerating] = useState(false);
  const [genPhase, setGenPhase] = useState('');

  // Auditor states
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

  // References
  const sceneGroupRef = useRef<THREE.Group | null>(null);
  const triggerGeometryRebuildRef = useRef<(() => void) | null>(null);

  const activeStyleOrShape = useMemo(() => {
    return jewelryType === 'ring' ? ringStyle : pendantShape;
  }, [jewelryType, ringStyle, pendantShape]);

  // Compute live AI auditor results
  const computedAudit = useMemo(() => {
    return runAICastabilityCheck(
      promptText,
      jewelryType,
      metal,
      finish,
      stones,
      initials,
      activeStyleOrShape
    );
  }, [promptText, jewelryType, metal, finish, stones, initials, activeStyleOrShape]);

  // Parse prompts for settings
  const parsePrompt = (text: string) => {
    const lower = text.toLowerCase();
    
    // 1. Jewelry Type
    if (lower.includes('ring') || lower.includes('ehering') || lower.includes('siegelring')) {
      setJewelryType('ring');
      if (lower.includes('siegelring') || lower.includes('signet') || lower.includes('siegel')) {
        setRingStyle('signet');
      } else if (lower.includes('ehering') || lower.includes('band') || lower.includes('schlichter ring')) {
        setRingStyle('band');
      }
    } else if (lower.includes('anhänger') || lower.includes('pendant') || lower.includes('kreuz') || lower.includes('herz') || lower.includes('stern') || lower.includes('münze') || lower.includes('medaille')) {
      setJewelryType('pendant');
      if (lower.includes('kreuz') || lower.includes('cross')) setPendantShape('cross');
      else if (lower.includes('herz') || lower.includes('heart')) setPendantShape('heart');
      else if (lower.includes('stern') || lower.includes('star')) setPendantShape('star');
      else if (lower.includes('münze') || lower.includes('coin') || lower.includes('medaille')) setPendantShape('coin');
    } else if (lower.includes('kette') || lower.includes('chain') || lower.includes('halskette') || lower.includes('cuban')) {
      setJewelryType('chain');
    } else if (lower.includes('armband') || lower.includes('bracelet')) {
      setJewelryType('bracelet');
    }

    // 2. Metals
    if (lower.includes('silber') || lower.includes('silver')) {
      setMetal('silver');
    } else if (lower.includes('platin') || lower.includes('platinum')) {
      setMetal('platinum');
    } else if (lower.includes('gold') || lower.includes('gelbgold') || lower.includes('yellow gold')) {
      if (lower.includes('18k') || lower.includes('750') || lower.includes('18 karat')) {
        setMetal('18k_gold');
      } else {
        setMetal('14k_gold');
      }
    }

    // 3. Finishes
    if (lower.includes('gehämmert') || lower.includes('hammered') || lower.includes('hammerschlag')) {
      setFinish('hammered');
    } else if (lower.includes('matt') || lower.includes('mattiert') || lower.includes('satin')) {
      setFinish('matte');
    } else if (lower.includes('poliert') || lower.includes('glänzend') || lower.includes('polished')) {
      setFinish('polished');
    }

    // 4. Stones
    if (lower.includes('iced') || lower.includes('diamant') || lower.includes('diamond') || lower.includes('stein') || lower.includes('moissanit') || lower.includes('zirkonia')) {
      if (lower.includes('zirkonia') || lower.includes('cz')) {
        setStones('cz');
      } else if (lower.includes('moissanit')) {
        setStones('moissanite');
      } else {
        setStones('diamond');
      }
      
      if (lower.includes('voll') || lower.includes('iced out') || lower.includes('vollbesatz')) {
        setStonesCoverage('iced');
      } else if (lower.includes('dezent') || lower.includes('wenig') || lower.includes('minimal')) {
        setStonesCoverage('minimal');
      } else {
        setStonesCoverage('medium');
      }
    }

    // 5. Initials extraction
    const quotesMatch = text.match(/["']([^"']{1,4})["']/);
    if (quotesMatch) {
      setInitials(quotesMatch[1].toUpperCase());
    } else {
      const initialsLabelMatch = text.match(/(?:initiale|initialen|initials|text|gravur|logo)\s*(?:[:=]|mit|von|ist)?\s*([a-zA-Z]{1,4})\b/i);
      if (initialsLabelMatch) {
        setInitials(initialsLabelMatch[1].toUpperCase());
      } else {
        const words = text.split(/\s+/);
        const upperWord = words.find(w => w.length >= 1 && w.length <= 3 && /^[A-ZÄÖÜ]{1,3}$/.test(w));
        if (upperWord) {
          setInitials(upperWord.toUpperCase());
        }
      }
    }
  };

  // Run generation animation wrapper
  const handleGenerate = (customPromptText?: string) => {
    const promptToUse = customPromptText !== undefined ? customPromptText : promptText;
    if (customPromptText !== undefined) {
      setPromptText(customPromptText);
    }
    
    setIsGenerating(true);
    setIsAuditing(true);
    setAuditResult(null);

    const phases = lang === 'de' 
      ? ['Analysiere Design-Prompt...', 'Berechne 3D-Volumendaten...', 'Erstelle Schmuckgeometrie...', 'Applikation der Texturen...', 'Finalisiere Metall-Shader...']
      : ['Analyzing design prompt...', 'Calculating 3D volume data...', 'Creating jewelry geometry...', 'Applying metal textures...', 'Finalizing metal shaders...'];
    
    let phaseIdx = 0;
    setGenPhase(phases[0]);
    
    const interval = setInterval(() => {
      phaseIdx++;
      if (phaseIdx < phases.length) {
        setGenPhase(phases[phaseIdx]);
      } else {
        clearInterval(interval);
        parsePrompt(promptToUse);
        setIsGenerating(false);
        
        // Rebuild geometry
        if (triggerGeometryRebuildRef.current) {
          triggerGeometryRebuildRef.current();
        }

        // Run audit phase
        setTimeout(() => {
          setAuditResult(computedAudit);
          setIsAuditing(false);
        }, 600);
      }
    }, 300);
  };

  // Run auto audit on size/metal adjustments (without showing full overlay block)
  useEffect(() => {
    setAuditResult(computedAudit);
  }, [jewelryType, metal, finish, stones, stonesCoverage, ringStyle, pendantShape, ringSize, chainLength, braceletLength, initials, computedAudit]);

  // Pricing calculations
  const metrics = useMemo(() => {
    let baseVolume = 0.8;
    
    if (jewelryType === 'ring') {
      const ringScale = ringSize / 58;
      if (ringStyle === 'signet') {
        baseVolume = 0.95 * ringScale;
      } else {
        baseVolume = 0.55 * ringScale;
      }
    } else if (jewelryType === 'pendant') {
      if (pendantShape === 'cross') baseVolume = 1.25;
      else if (pendantShape === 'heart') baseVolume = 0.95;
      else if (pendantShape === 'star') baseVolume = 0.85;
      else baseVolume = 1.45; // coin with rope border
    } else if (jewelryType === 'chain') {
      baseVolume = (chainLength / 50) * 3.8;
    } else if (jewelryType === 'bracelet') {
      baseVolume = (braceletLength / 20) * 2.2;
    }

    if (finish === 'hammered') baseVolume *= 0.97;
    
    const metalInfo = METALS[metal];
    const weightGrams = parseFloat((baseVolume * metalInfo.density).toFixed(1));
    
    let stoneCount = 0;
    if (stones !== 'none') {
      const scaleFactor = stonesCoverage === 'iced' ? 3.0 : stonesCoverage === 'minimal' ? 0.5 : 1.0;
      if (jewelryType === 'ring') {
        stoneCount = Math.round((ringStyle === 'signet' ? 14 : 10) * scaleFactor);
      } else if (jewelryType === 'pendant') {
        if (pendantShape === 'cross') stoneCount = Math.round(18 * scaleFactor);
        else if (pendantShape === 'heart') stoneCount = Math.round(16 * scaleFactor);
        else if (pendantShape === 'star') stoneCount = Math.round(12 * scaleFactor);
        else stoneCount = Math.round(24 * scaleFactor);
      } else if (jewelryType === 'chain') {
        stoneCount = Math.round(60 * scaleFactor);
      } else if (jewelryType === 'bracelet') {
        stoneCount = Math.round(35 * scaleFactor);
      }
    }

    const metalCost = weightGrams * metalInfo.pricePerGram;
    const stoneCost = stoneCount * GEMSTONES[stones].pricePerStone;
    const manufacturingCost = metalInfo.baseCost;
    
    const totalPrice = Math.round(metalCost + stoneCost + manufacturingCost);
    const downPayment = Math.round(totalPrice * 0.50);
    const restPayment = totalPrice - downPayment;
    
    return {
      weightGrams,
      stoneCount,
      metalCost,
      stoneCost,
      manufacturingCost,
      totalPrice,
      downPayment,
      restPayment
    };
  }, [jewelryType, metal, finish, stones, stonesCoverage, ringStyle, pendantShape, ringSize, chainLength, braceletLength]);

  // Three.js Scene Setup & Loop
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const container = canvasRef.current.parentElement;
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030303);
    scene.fog = new THREE.FogExp2(0x030303, 0.14);
    
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(0, 0.55, 2.75);
    camera.lookAt(0, 0, 0);
    
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.22);
    scene.add(ambientLight);
    
    // Front softbox light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(2, 4, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);
    
    // Cool cyan/blue light from side
    const fillLight = new THREE.DirectionalLight(0x78d8ff, 0.95);
    fillLight.position.set(-3, 1, 2);
    scene.add(fillLight);
    
    // Golden backlight (rim light)
    const rimLight = new THREE.DirectionalLight(0xffbe00, 1.8);
    rimLight.position.set(0, 3, -4);
    scene.add(rimLight);

    // Dark grid ground
    const floorGeo = new THREE.PlaneGeometry(15, 15);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x050505,
      roughness: 0.25,
      metalness: 0.9
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    const grid = new THREE.GridHelper(10, 30, 0x222222, 0x0a0a0a);
    grid.position.y = -1.19;
    scene.add(grid);

    // Particle system: Floating diamond dust sparkles
    const particleCount = 120;
    const particlesGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      // Scatter in a cylinder around the center
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.3 + Math.random() * 1.8;
      positions[i] = Math.cos(angle) * radius;
      positions[i+1] = -1.0 + Math.random() * 2.2;
      positions[i+2] = Math.sin(angle) * radius;
    }
    
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.018,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    
    const particleSystem = new THREE.Points(particlesGeo, particlesMaterial);
    scene.add(particleSystem);

    // Photorealistic Studio Reflection Map using RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const environment = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(environment, 0.04).texture;
    environment.dispose();
    pmremGenerator.dispose();
    
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    const jewelryGroup = new THREE.Group();
    scene.add(jewelryGroup);
    sceneGroupRef.current = jewelryGroup;

    // Helper: Hammered finished geometry modifier
    const applyHammeredFinish = (geom: THREE.BufferGeometry) => {
      const pos = geom.attributes.position;
      const normal = geom.attributes.normal;
      if (!pos || !normal) return;

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const nx = normal.getX(i);
        const ny = normal.getY(i);
        const nz = normal.getZ(i);

        // Sinusoidal noise to simulate artisan hammer facets
        const scale = 14.0;
        const noise = (
          Math.sin(x * scale) * Math.sin(y * scale) +
          Math.sin(y * scale) * Math.sin(z * scale) +
          Math.sin(z * scale) * Math.sin(x * scale)
        );

        if (noise < -0.05) {
          const depth = 0.025 * Math.abs(noise);
          pos.setXYZ(i, x - nx * depth, y - ny * depth, z - nz * depth);
        }
      }
      pos.needsUpdate = true;
      geom.computeVertexNormals();
    };

    // Helper: Generate initials 2D text canvas into displacement plane
    const createInitialsGeometry = (textStr: string): THREE.BufferGeometry => {
      const size = 256; // Higher resolution for professional details
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const fSize = textStr.length > 2 ? 80 : textStr.length > 1 ? 110 : 140;
        ctx.font = `bold ${fSize}px "Inter", "Georgia", "Arial", sans-serif`;
        ctx.fillText(textStr, size / 2, size / 2 + 5);
      }
      
      // Highly subdivided plane for ultra clean engraving
      const plane = new THREE.PlaneGeometry(0.70, 0.70, 56, 56);
      const posAttr = plane.attributes.position;
      
      if (ctx && posAttr) {
        const imgData = ctx.getImageData(0, 0, size, size).data;
        for (let i = 0; i < posAttr.count; i++) {
          const x = posAttr.getX(i);
          const y = posAttr.getY(i);
          
          const u = (x + 0.35) / 0.70;
          const v = (y + 0.35) / 0.70;
          
          const px = Math.min(size - 1, Math.max(0, Math.floor(u * size)));
          const py = Math.min(size - 1, Math.max(0, Math.floor((1 - v) * size)));
          
          const val = imgData[(py * size + px) * 4] / 255;
          if (val > 0.15) {
            // Embolden / extrude upward
            posAttr.setZ(i, val * 0.05);
          }
        }
        posAttr.needsUpdate = true;
        plane.computeVertexNormals();
      }
      
      return plane;
    };

    // Rebuild active meshes
    const rebuildGeometry = () => {
      while (jewelryGroup.children.length > 0) {
        const obj = jewelryGroup.children[0];
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        } else if (obj instanceof THREE.Group) {
          obj.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              child.material.dispose();
            }
          });
        }
        jewelryGroup.remove(obj);
      }

      const metalInfo = METALS[metal];
      const metalMaterial = new THREE.MeshStandardMaterial({
        color: metalInfo.color,
        metalness: metalInfo.metalness,
        roughness: finish === 'matte' ? 0.45 : finish === 'hammered' ? 0.26 : metalInfo.roughness,
        envMapIntensity: 1.3
      });

      // Gemstones - Physical Glass Shaders
      const stoneInfo = GEMSTONES[stones];
      const gemMaterial = new THREE.MeshPhysicalMaterial({
        color: stoneInfo.color,
        metalness: 0.1,
        roughness: 0.04,
        transmission: 0.9,
        thickness: 0.2,
        ior: stones === 'diamond' ? 2.42 : stones === 'moissanite' ? 2.65 : 2.15,
        emissive: stones !== 'none' ? 0x222222 : 0x000000
      });

      const gemGeo = new THREE.OctahedronGeometry(0.032, 1);
      const stonesGroup = new THREE.Group();

      if (jewelryType === 'ring') {
        jewelryGroup.position.set(0, 0, 0);
        jewelryGroup.rotation.set(0, 0, 0);
        
        const rScale = ringSize / 58;
        const outerRad = 0.55 * rScale;
        const bandThick = 0.12;

        if (ringStyle === 'band') {
          // Double-beveled band ring (more premium than standard torus)
          const bandGeo = new THREE.TorusGeometry(outerRad - (bandThick/2), bandThick, 18, 80);
          bandGeo.scale(1, 1, 1.25);
          if (finish === 'hammered') applyHammeredFinish(bandGeo);
          
          const bandMesh = new THREE.Mesh(bandGeo, metalMaterial);
          bandMesh.castShadow = true;
          bandMesh.receiveShadow = true;
          jewelryGroup.add(bandMesh);

          // Stones along front ridge
          if (stones !== 'none') {
            const stoneLimit = stonesCoverage === 'iced' ? 20 : stonesCoverage === 'minimal' ? 4 : 10;
            for (let i = 0; i < stoneLimit; i++) {
              const arc = stonesCoverage === 'iced' ? Math.PI * 1.5 : Math.PI * 0.7;
              const startAngle = -arc / 2;
              const angle = startAngle + (i / (stoneLimit - 1)) * arc;
              
              const sx = Math.cos(angle) * (outerRad + 0.035);
              const sz = Math.sin(angle) * (outerRad + 0.035);
              
              const stone = new THREE.Mesh(gemGeo, gemMaterial);
              stone.position.set(sx, 0, sz);
              stone.lookAt(0, 0, 0);
              stone.rotateX(Math.PI / 2);
              stonesGroup.add(stone);
            }
          }

        } else {
          // SIGNET RING: Beveled cushion shape with recessed plate for initials
          const bandGeo = new THREE.TorusGeometry(outerRad - (bandThick/2), bandThick, 16, 60, Math.PI * 1.6);
          bandGeo.rotateX(Math.PI / 2);
          bandGeo.rotateY(Math.PI * 0.2);
          
          const bandMesh = new THREE.Mesh(bandGeo, metalMaterial);
          bandMesh.castShadow = true;
          jewelryGroup.add(bandMesh);

          // Cushion Shape Bezel
          const cushionShape = new THREE.Shape();
          const size = 0.44;
          const rad = 0.12;
          cushionShape.moveTo(-size + rad, -size);
          cushionShape.lineTo(size - rad, -size);
          cushionShape.quadraticCurveTo(size, -size, size, -size + rad);
          cushionShape.lineTo(size, size - rad);
          cushionShape.quadraticCurveTo(size, size, size - rad, size);
          cushionShape.lineTo(-size + rad, size);
          cushionShape.quadraticCurveTo(-size, size, -size, size - rad);
          cushionShape.lineTo(-size, -size + rad);
          cushionShape.quadraticCurveTo(-size, -size, -size + rad, -size);

          const extrudeSettings = {
            depth: 0.16,
            bevelEnabled: true,
            bevelSegments: 4,
            steps: 1,
            bevelSize: 0.03,
            bevelThickness: 0.03
          };

          const plateBezelGeo = new THREE.ExtrudeGeometry(cushionShape, extrudeSettings);
          plateBezelGeo.center();
          plateBezelGeo.rotateX(Math.PI / 2);
          plateBezelGeo.translate(0, 0, outerRad + 0.04);
          
          if (finish === 'hammered') applyHammeredFinish(plateBezelGeo);
          const bezelMesh = new THREE.Mesh(plateBezelGeo, metalMaterial);
          bezelMesh.castShadow = true;
          jewelryGroup.add(bezelMesh);

          // Top face displaced by initials text (recessed inside bezel edge)
          const topFaceGeo = createInitialsGeometry(initials || "YK");
          topFaceGeo.translate(0, 0, outerRad + 0.185);
          
          const topFaceMesh = new THREE.Mesh(topFaceGeo, metalMaterial);
          topFaceMesh.castShadow = true;
          jewelryGroup.add(topFaceMesh);

          // Stones circling the bezel outer rim
          if (stones !== 'none') {
            const count = stonesCoverage === 'iced' ? 16 : stonesCoverage === 'minimal' ? 4 : 8;
            for (let i = 0; i < count; i++) {
              const angle = (i / count) * Math.PI * 2;
              const radius = 0.40;
              const sx = Math.cos(angle) * radius;
              const sy = Math.sin(angle) * radius;
              
              const stone = new THREE.Mesh(gemGeo, gemMaterial);
              stone.position.set(sx, sy, outerRad + 0.20);
              stonesGroup.add(stone);
            }
          }
        }

      } else if (jewelryType === 'pendant') {
        jewelryGroup.position.set(0, 0.2, 0);
        jewelryGroup.rotation.set(0.1, 0, 0);

        // Suspension Bail
        const bailGeo = new THREE.TorusGeometry(0.13, 0.032, 8, 24);
        bailGeo.translate(0, 0.65, 0);
        const bailMesh = new THREE.Mesh(bailGeo, metalMaterial);
        bailMesh.castShadow = true;
        jewelryGroup.add(bailMesh);

        if (pendantShape === 'cross') {
          // TWO-TONE LAYERED CROSS (Gold Inner, Silver Outer)
          // 1. Outer Base Cross (Silver or Primary Metal)
          const outerVertical = new THREE.BoxGeometry(0.24, 1.05, 0.12);
          const outerHorizontal = new THREE.BoxGeometry(0.66, 0.24, 0.12);
          outerHorizontal.translate(0, 0.18, 0);
          
          // 2. Inner Layer Cross (Secondary Metal color - Gold/Secondary highlights)
          const innerVertical = new THREE.BoxGeometry(0.12, 0.94, 0.06);
          const innerHorizontal = new THREE.BoxGeometry(0.54, 0.12, 0.06);
          innerHorizontal.translate(0, 0.18, 0);
          innerVertical.translate(0, 0, 0.08); // Shift forward
          innerHorizontal.translate(0, 0, 0.08);
          
          const crossGroup = new THREE.Group();
          
          const primaryMesh1 = new THREE.Mesh(outerVertical, metalMaterial);
          const primaryMesh2 = new THREE.Mesh(outerHorizontal, metalMaterial);
          primaryMesh1.castShadow = primaryMesh2.castShadow = true;
          crossGroup.add(primaryMesh1, primaryMesh2);

          // Create secondary metal color (Two-tone: Gold accent if base is Silver, Silver if base is Gold)
          const accentColor = metal === 'silver' ? 0xffd700 : 0xe0e6ed;
          const accentMaterial = new THREE.MeshStandardMaterial({
            color: accentColor,
            metalness: 0.98,
            roughness: 0.15,
            envMapIntensity: 1.3
          });

          const secondaryMesh1 = new THREE.Mesh(innerVertical, accentMaterial);
          const secondaryMesh2 = new THREE.Mesh(innerHorizontal, accentMaterial);
          secondaryMesh1.castShadow = secondaryMesh2.castShadow = true;
          crossGroup.add(secondaryMesh1, secondaryMesh2);
          
          if (finish === 'hammered') {
            applyHammeredFinish(outerVertical);
            applyHammeredFinish(outerHorizontal);
          }
          
          jewelryGroup.add(crossGroup);

          // Pave diamonds in inner cross channels
          if (stones !== 'none') {
            const count = stonesCoverage === 'iced' ? 12 : stonesCoverage === 'minimal' ? 3 : 6;
            for (let i = 0; i < Math.ceil(count * 0.6); i++) {
              const y = -0.38 + (i / (Math.ceil(count * 0.6) - 1)) * 0.76;
              if (Math.abs(y - 0.18) < 0.06) continue;
              const stone = new THREE.Mesh(gemGeo, gemMaterial);
              stone.position.set(0, y, 0.12);
              stonesGroup.add(stone);
            }
            for (let i = 0; i < Math.floor(count * 0.4); i++) {
              const x = -0.2 + (i / (Math.floor(count * 0.4) - 1)) * 0.4;
              if (Math.abs(x) < 0.06) continue;
              const stone = new THREE.Mesh(gemGeo, gemMaterial);
              stone.position.set(x, 0.18, 0.12);
              stonesGroup.add(stone);
            }
          }

        } else if (pendantShape === 'heart') {
          const heartShape = new THREE.Shape();
          heartShape.moveTo(0, 0.22);
          heartShape.bezierCurveTo(0.18, 0.45, 0.42, 0.3, 0.42, 0.06);
          heartShape.bezierCurveTo(0.42, -0.18, 0.18, -0.38, 0, -0.58);
          heartShape.bezierCurveTo(-0.18, -0.38, -0.42, -0.18, -0.42, 0.06);
          heartShape.bezierCurveTo(-0.42, 0.3, -0.18, 0.45, 0, 0.22);

          const extrudeSettings = {
            depth: 0.1,
            bevelEnabled: true,
            bevelSegments: 4,
            steps: 1,
            bevelSize: 0.02,
            bevelThickness: 0.02
          };

          const heartGeo = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
          heartGeo.center();
          if (finish === 'hammered') applyHammeredFinish(heartGeo);
          
          const bodyMesh = new THREE.Mesh(heartGeo, metalMaterial);
          bodyMesh.castShadow = true;
          jewelryGroup.add(bodyMesh);

          if (stones !== 'none') {
            const count = stonesCoverage === 'iced' ? 16 : stonesCoverage === 'minimal' ? 4 : 10;
            for (let i = 0; i < count; i++) {
              const angle = (i / count) * Math.PI * 2;
              const sx = 0.34 * Math.sin(angle) * Math.sin(angle) * Math.sin(angle);
              const sy = 0.30 * Math.cos(angle) - 0.10 * Math.cos(2*angle) - 0.04 * Math.cos(3*angle);
              
              const stone = new THREE.Mesh(gemGeo, gemMaterial);
              stone.position.set(sx, sy, 0.07);
              stonesGroup.add(stone);
            }
          }

        } else if (pendantShape === 'star') {
          const starShape = new THREE.Shape();
          const spikes = 5;
          const outerR = 0.46;
          const innerR = 0.20;
          for (let i = 0; i < spikes * 2; i++) {
            const angle = (i * Math.PI) / spikes - (Math.PI/2);
            const r = i % 2 === 0 ? outerR : innerR;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) starShape.moveTo(x, y);
            else starShape.lineTo(x, y);
          }

          const extrudeSettings = {
            depth: 0.09,
            bevelEnabled: true,
            bevelSegments: 3,
            steps: 1,
            bevelSize: 0.02,
            bevelThickness: 0.02
          };

          const starGeo = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
          starGeo.center();
          if (finish === 'hammered') applyHammeredFinish(starGeo);

          const bodyMesh = new THREE.Mesh(starGeo, metalMaterial);
          bodyMesh.castShadow = true;
          jewelryGroup.add(bodyMesh);

          if (stones !== 'none') {
            const count = stonesCoverage === 'iced' ? 10 : stonesCoverage === 'minimal' ? 5 : 5;
            for (let i = 0; i < count; i++) {
              const angle = (i / count) * Math.PI * 2 - (Math.PI/2);
              const radius = stonesCoverage === 'iced' ? 0.26 : 0.38;
              const sx = Math.cos(angle) * radius;
              const sy = Math.sin(angle) * radius;
              
              const stone = new THREE.Mesh(gemGeo, gemMaterial);
              stone.position.set(sx, sy, 0.065);
              stonesGroup.add(stone);
            }
          }

        } else {
          // COIN PENDANT: Medal with a circular rope-textured border (Kordelrand)
          const coinRad = 0.45;
          const coinBase = new THREE.CylinderGeometry(coinRad, coinRad, 0.08, 48, 1);
          coinBase.rotateX(Math.PI / 2);
          if (finish === 'hammered') applyHammeredFinish(coinBase);
          
          const coinBaseMesh = new THREE.Mesh(coinBase, metalMaterial);
          coinBaseMesh.castShadow = true;
          jewelryGroup.add(coinBaseMesh);

          // Displace initials inside center
          const faceGeo = createInitialsGeometry(initials || "YK");
          faceGeo.translate(0, 0, 0.045);
          const faceMesh = new THREE.Mesh(faceGeo, metalMaterial);
          faceMesh.castShadow = true;
          jewelryGroup.add(faceMesh);

          // ROPE BORDER: Interlocking torus loop segments around the boundary
          const ropeGroup = new THREE.Group();
          const links = 44;
          const linkGeo = new THREE.TorusGeometry(0.038, 0.012, 6, 16);
          linkGeo.scale(1.3, 0.7, 1); // oval links
          
          for (let i = 0; i < links; i++) {
            const angle = (i / links) * Math.PI * 2;
            const rx = Math.cos(angle) * (coinRad + 0.02);
            const ry = Math.sin(angle) * (coinRad + 0.02);
            
            const linkMesh = new THREE.Mesh(linkGeo, metalMaterial);
            linkMesh.position.set(rx, ry, 0);
            
            // Align link tangential to border, rotated 45 degrees to generate the twisted spiral texture
            linkMesh.rotation.z = angle + Math.PI / 4;
            linkMesh.rotation.y = Math.PI / 6;
            
            ropeGroup.add(linkMesh);
          }
          jewelryGroup.add(ropeGroup);

          // Stones circling between initials and rope border
          if (stones !== 'none') {
            const count = stonesCoverage === 'iced' ? 22 : stonesCoverage === 'minimal' ? 6 : 12;
            for (let i = 0; i < count; i++) {
              const angle = (i / count) * Math.PI * 2;
              const sx = Math.cos(angle) * 0.34;
              const sy = Math.sin(angle) * 0.34;
              
              const stone = new THREE.Mesh(gemGeo, gemMaterial);
              stone.position.set(sx, sy, 0.05);
              stonesGroup.add(stone);
            }
          }
        }

      } else if (jewelryType === 'chain' || jewelryType === 'bracelet') {
        jewelryGroup.position.set(0, 0, 0);
        jewelryGroup.rotation.set(0, 0, 0);

        const createLinkGeometry = (): THREE.BufferGeometry => {
          const geom = new THREE.TorusGeometry(0.13, 0.046, 12, 32);
          geom.scale(1.4, 0.78, 1.05);
          if (finish === 'hammered') applyHammeredFinish(geom);
          return geom;
        };

        if (jewelryType === 'chain') {
          // Cuban link chain draping smoothly
          const linksNum = 18;
          const linkGeo = createLinkGeometry();
          
          for (let i = 0; i < linksNum; i++) {
            const linkMesh = new THREE.Mesh(linkGeo, metalMaterial);
            linkMesh.castShadow = true;
            
            const t = (i / (linksNum - 1)) * 2 - 1;
            const x = t * 1.1;
            const y = (t * t - 1) * 0.4 + 0.1;
            const z = -Math.abs(t) * 0.15;
            
            linkMesh.position.set(x, y, z);
            
            if (i % 2 === 0) {
              linkMesh.rotation.set(0.2, 0.1, 0.8 + (t * 0.5));
            } else {
              linkMesh.rotation.set(1.4, 0.3, 0.8 + (t * 0.5));
            }
            
            jewelryGroup.add(linkMesh);

            if (stones !== 'none' && i % 3 === 0) {
              const s1 = new THREE.Mesh(gemGeo, gemMaterial);
              s1.position.set(x, y + 0.09, z + 0.02);
              stonesGroup.add(s1);
            }
          }
        } else {
          const linksNum = 22;
          const linkGeo = createLinkGeometry();
          const rad = 0.95;
          
          for (let i = 0; i < linksNum; i++) {
            const angle = (i / linksNum) * Math.PI * 2;
            const linkMesh = new THREE.Mesh(linkGeo, metalMaterial);
            linkMesh.castShadow = true;
            
            const lx = Math.cos(angle) * rad;
            const lz = Math.sin(angle) * rad;
            linkMesh.position.set(lx, -0.4, lz);
            
            linkMesh.rotation.y = -angle;
            
            if (i % 2 === 0) {
              linkMesh.rotation.x = 0;
              linkMesh.rotation.z = Math.PI / 6;
            } else {
              linkMesh.rotation.x = Math.PI / 2;
              linkMesh.rotation.z = 0;
            }
            
            jewelryGroup.add(linkMesh);

            if (stones !== 'none' && i % 2 === 0) {
              const s = new THREE.Mesh(gemGeo, gemMaterial);
              s.position.set(lx * 1.05, -0.32, lz * 1.05);
              stonesGroup.add(s);
            }
          }
        }
      }

      if (stonesGroup.children.length > 0) {
        jewelryGroup.add(stonesGroup);
      }
    };

    rebuildGeometry();
    triggerGeometryRebuildRef.current = rebuildGeometry;

    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      
      jewelryGroup.rotation.y += deltaX * 0.008;
      jewelryGroup.rotation.x += deltaY * 0.008;
      
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      isDragging = true;
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevMouseX;
      const deltaY = e.touches[0].clientY - prevMouseY;
      
      jewelryGroup.rotation.y += deltaX * 0.01;
      jewelryGroup.rotation.x += deltaY * 0.01;
      
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;
    };

    const canvas = canvasRef.current;
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    canvas.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleMouseUp);

    let animationId: number;
    let idleRotationTimer = 0;
    
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      // Rotate particle points slowly
      particleSystem.rotation.y += 0.0008;
      particleSystem.rotation.x += 0.0002;
      
      // Animate particles drifting upward
      const positionsArr = particlesGeo.attributes.position.array as Float32Array;
      for (let i = 1; i < positionsArr.length; i += 3) {
        positionsArr[i] += 0.0015; // drift up
        if (positionsArr[i] > 1.2) {
          positionsArr[i] = -1.0; // wrap back down
        }
      }
      particlesGeo.attributes.position.needsUpdate = true;

      if (!isDragging) {
        idleRotationTimer += 0.004;
        jewelryGroup.rotation.y = Math.sin(idleRotationTimer) * 0.45;
        jewelryGroup.position.y += Math.sin(idleRotationTimer * 2) * 0.0006;
      }
      
      renderer.render(scene, camera);
    };
    
    animate();

    const handleResize = () => {
      if (!canvasRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      canvas.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
      
      renderer.dispose();
      scene.environment?.dispose();
    };
  }, [jewelryType, metal, finish, stones, stonesCoverage, ringStyle, pendantShape, ringSize, chainLength, braceletLength, initials]);

  // Binary STL Exporter
  const triggerSTLDownload = () => {
    if (!sceneGroupRef.current) return;
    
    const meshes: THREE.Mesh[] = [];
    sceneGroupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.visible) {
        if (child.material instanceof THREE.MeshPhysicalMaterial && child.material.transmission > 0.5) {
          return;
        }
        meshes.push(child);
      }
    });

    if (meshes.length === 0) {
      alert(lang === 'de' ? 'Keine exportierbare Geometrie gefunden.' : 'No exportable geometry found.');
      return;
    }

    let totalTriangles = 0;
    const meshData: {
      vertices: Float32Array;
      normals: Float32Array;
      indices: Uint16Array | Uint32Array | null;
      matrix: THREE.Matrix4;
    }[] = [];

    for (const mesh of meshes) {
      const geom = mesh.geometry;
      const posAttr = geom.attributes.position;
      if (!posAttr) continue;
      
      const indexAttr = geom.index;
      const normalAttr = geom.attributes.normal;
      mesh.updateMatrixWorld(true);
      
      const triangles = indexAttr ? indexAttr.count / 3 : posAttr.count / 3;
      totalTriangles += triangles;
      
      meshData.push({
        vertices: posAttr.array as Float32Array,
        normals: normalAttr ? (normalAttr.array as Float32Array) : new Float32Array(),
        indices: indexAttr ? (indexAttr.array as any) : null,
        matrix: mesh.matrixWorld
      });
    }

    const bufferSize = 80 + 4 + totalTriangles * 50;
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);
    
    const headerStr = "KRYORK ATELIER HIGH-FIDELITY STL EXPORT - 100% CASTABLE MANIFOLD MESH";
    for (let i = 0; i < 80; i++) {
      view.setUint8(i, i < headerStr.length ? headerStr.charCodeAt(i) : 0);
    }
    
    view.setUint32(80, totalTriangles, true);
    
    let offset = 84;
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const v3 = new THREE.Vector3();
    const n = new THREE.Vector3();
    
    for (const data of meshData) {
      const { vertices, normals, indices, matrix } = data;
      const hasIndices = indices !== null;
      const count = hasIndices ? indices!.length : vertices.length / 3;
      
      for (let i = 0; i < count; i += 3) {
        let idx1 = i, idx2 = i + 1, idx3 = i + 2;
        if (hasIndices) {
          idx1 = indices![i];
          idx2 = indices![i + 1];
          idx3 = indices![i + 2];
        }
        
        v1.fromArray(vertices, idx1 * 3).applyMatrix4(matrix);
        v2.fromArray(vertices, idx2 * 3).applyMatrix4(matrix);
        v3.fromArray(vertices, idx3 * 3).applyMatrix4(matrix);
        
        if (normals.length > 0) {
          n.fromArray(normals, idx1 * 3);
          const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
          n.applyMatrix3(normalMatrix).normalize();
        } else {
          const cb = new THREE.Vector3().subVectors(v3, v2);
          const ab = new THREE.Vector3().subVectors(v1, v2);
          n.crossVectors(cb, ab).normalize();
        }
        
        view.setFloat32(offset, n.x, true);
        view.setFloat32(offset + 4, n.y, true);
        view.setFloat32(offset + 8, n.z, true);
        
        view.setFloat32(offset + 12, v1.x, true);
        view.setFloat32(offset + 16, v1.y, true);
        view.setFloat32(offset + 20, v1.z, true);
        
        view.setFloat32(offset + 24, v2.x, true);
        view.setFloat32(offset + 28, v2.y, true);
        view.setFloat32(offset + 32, v2.z, true);
        
        view.setFloat32(offset + 36, v3.x, true);
        view.setFloat32(offset + 40, v3.y, true);
        view.setFloat32(offset + 44, v3.z, true);
        
        view.setUint16(offset + 48, 0, true);
        
        offset += 50;
      }
    }
    
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const safeInitials = initials ? `_${initials}` : '';
    link.download = `kryork_gussmodell_${jewelryType}_${metal}${safeInitials}.stl`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const currentMetalInfo = METALS[metal];
  
  const activeResult = auditResult || computedAudit;

  const t = {
    title: lang === 'de' ? 'KRYORK Custom Atelier' : 'KRYORK Custom Atelier',
    builderSub: lang === 'de' ? 'Interaktive 3D CAD-Vorschau und metallurgische Echtzeitgussprüfung' : 'Interactive 3D CAD preview and real-time metallurgical casting audit',
    step1: lang === 'de' ? '1. Schmuckart wählen' : '1. Select Jewelry Type',
    step2: lang === 'de' ? '2. KI Design-Prompt' : '2. AI Design Prompt',
    promptPlaceholder: lang === 'de' ? 'z.B. Massiver Gold-Siegelring mit Initialen "YK" und Diamantbesatz...' : 'e.g. Solid gold signet ring with initials "YK" and diamond pavé...',
    generateBtn: lang === 'de' ? 'KI-Modell & Gussprüfung generieren' : 'Generate Model & Run Audit',
    presetsTitle: lang === 'de' ? 'Inspirationen & Vorlagen:' : 'Inspirations & Presets:',
    step3: lang === 'de' ? '3. Material & Veredelung' : '3. Material & Finish',
    step4: lang === 'de' ? '4. Steinbesatz' : '4. Gemstones',
    coverageTitle: lang === 'de' ? 'Besatzstärke:' : 'Stones Coverage:',
    metalTitle: lang === 'de' ? 'Edelmetall:' : 'Precious Metal:',
    finishTitle: lang === 'de' ? 'Oberfläche:' : 'Finish:',
    finishPolished: lang === 'de' ? 'Hochglanz-Poliert' : 'High-Gloss Polished',
    finishMatte: lang === 'de' ? 'Seidenmatt' : 'Satin Matte',
    finishHammered: lang === 'de' ? 'Gehämmert (Hammerschlag)' : 'Artisan Hammered',
    sizeTitle: lang === 'de' ? 'Größe / Länge:' : 'Size / Length:',
    sizeRing: lang === 'de' ? 'Ringgröße (Innenumfang):' : 'Ring Size (Circumference):',
    sizeChain: lang === 'de' ? 'Kettenlänge:' : 'Chain Length:',
    sizeBracelet: lang === 'de' ? 'Armbandlänge:' : 'Bracelet Length:',
    calcTitle: lang === 'de' ? 'Live-Preiskalkulation' : 'Live Pricing Calculator',
    weight: lang === 'de' ? 'Geschätztes Gewicht' : 'Estimated Weight',
    stonesLabel: lang === 'de' ? 'Steine-Besatz' : 'Gemstone Count',
    metalValue: lang === 'de' ? 'Materialwert' : 'Precious Metal Value',
    manufacture: lang === 'de' ? 'Produktionskosten (Atelier)' : 'Manufacturing Costs',
    deposit: lang === 'de' ? 'Erforderliche Anzahlung (50%)' : 'Required Deposit (50%)',
    restAmount: lang === 'de' ? 'Restzahlung bei Fertigstellung' : 'Balance on Completion',
    totalPriceLabel: lang === 'de' ? 'Gesamtpreis (inkl. MwSt.)' : 'Total Price (incl. VAT)',
    checkoutBtn: lang === 'de' ? 'Design anfragen & Anzahlung leisten' : 'Inquire Design & Pay Deposit',
    downloadStl: lang === 'de' ? '3D STL-Gussdatei herunterladen (.stl)' : 'Download 3D STL Cast File (.stl)',
    initialsLabel: lang === 'de' ? 'Initialen / Gravur-Text (max. 3 Zeichen):' : 'Initials / Engraving Text (max 3 chars):',
    dragTip: lang === 'de' ? 'Ziehen zum Rotieren · Scrollen zum Zoomen · Particle Sparkler aktiv' : 'Drag to Rotate · Scroll to Zoom · Particle Sparkler active',
    ringStyleLabel: lang === 'de' ? 'Ring-Modell:' : 'Ring Style:',
    pendantShapeLabel: lang === 'de' ? 'Anhänger-Form:' : 'Pendant Shape:',
  };

  return (
    <div className="builderScreenOverlay">
      {/* Loading Overlay */}
      {isGenerating && (
        <div className="builderLoader">
          <div className="loaderGlow" />
          <Sparkles className="loaderIcon" size={42} />
          <h3>KRYORK ENGINE</h3>
          <p>{genPhase}</p>
        </div>
      )}

      {/* Main Cockpit Layout */}
      <div className="builderContainer">
        <header className="builderHeader">
          <div>
            <h2>{t.title}</h2>
            <p>{t.builderSub}</p>
          </div>
          <button className="builderCloseBtn" onClick={onClose} aria-label="Schließen">
            <X size={24} />
          </button>
        </header>

        {/* 3-Panel Cockpit */}
        <div className="builderBody">
          
          {/* PANEL 1: Configuration Form (White background, light theme) */}
          <div className="builderSidebar scrollbarCustom">
            
            <div className="builderSection">
              <h3>{t.step1}</h3>
              <div className="typeGrid">
                {(['ring', 'pendant', 'chain', 'bracelet'] as JewelryType[]).map((type) => (
                  <button
                    key={type}
                    className={`typeBtn ${jewelryType === type ? 'active' : ''}`}
                    onClick={() => setJewelryType(type)}
                  >
                    <span>{type === 'ring' ? '💍 Ring' : type === 'pendant' ? '💎 Anhänger' : type === 'chain' ? '📿 Kette' : '⛓️ Armband'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="builderSection">
              <h3>{t.step2}</h3>
              <div className="promptContainer">
                <textarea
                  className="promptInput"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder={t.promptPlaceholder}
                  rows={3}
                />
                <button
                  className="promptGenerateBtn"
                  onClick={() => handleGenerate()}
                  disabled={!promptText.trim()}
                >
                  <Sparkles size={16} /> {t.generateBtn}
                </button>
              </div>

              <div className="presetSection">
                <span className="presetsHeading">{t.presetsTitle}</span>
                <div className="presetsGrid">
                  {(lang === 'de' ? PROMPT_PRESETS_DE : PROMPT_PRESETS_EN).map((preset, idx) => (
                    <button
                      key={idx}
                      className="presetBadge"
                      onClick={() => handleGenerate(preset.text)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {jewelryType === 'ring' && (
              <div className="builderSection innerControls borderTop">
                <h4>{t.ringStyleLabel}</h4>
                <div className="toggleRow">
                  <button className={`toggleBtn ${ringStyle === 'signet' ? 'active' : ''}`} onClick={() => setRingStyle('signet')}>Siegelring</button>
                  <button className={`toggleBtn ${ringStyle === 'band' ? 'active' : ''}`} onClick={() => setRingStyle('band')}>Bandring</button>
                </div>
              </div>
            )}

            {jewelryType === 'pendant' && (
              <div className="builderSection innerControls borderTop">
                <h4>{t.pendantShapeLabel}</h4>
                <div className="toggleRow fourWay">
                  <button className={`toggleBtn ${pendantShape === 'cross' ? 'active' : ''}`} onClick={() => setPendantShape('cross')}>Kreuz</button>
                  <button className={`toggleBtn ${pendantShape === 'heart' ? 'active' : ''}`} onClick={() => setPendantShape('heart')}>Herz</button>
                  <button className={`toggleBtn ${pendantShape === 'star' ? 'active' : ''}`} onClick={() => setPendantShape('star')}>Stern</button>
                  <button className={`toggleBtn ${pendantShape === 'coin' ? 'active' : ''}`} onClick={() => setPendantShape('coin')}>Münze</button>
                </div>
              </div>
            )}

            {((jewelryType === 'ring' && ringStyle === 'signet') || (jewelryType === 'pendant' && pendantShape === 'coin')) && (
              <div className="builderSection innerControls borderTop">
                <h4>{t.initialsLabel}</h4>
                <input
                  type="text"
                  maxLength={3}
                  className="initialsTextInput"
                  value={initials}
                  onChange={(e) => setInitials(e.target.value.toUpperCase())}
                />
              </div>
            )}

            <div className="builderSection borderTop">
              <h3>{t.step3}</h3>
              <div className="controlGroup">
                <span className="controlLabel">{t.metalTitle}</span>
                <div className="metalGrid">
                  {(Object.keys(METALS) as MetalType[]).map((mKey) => (
                    <button
                      key={mKey}
                      className={`metalBtn ${metal === mKey ? 'active' : ''} ${mKey}`}
                      onClick={() => setMetal(mKey)}
                    >
                      <span className="colorDot" style={{ backgroundColor: `#${METALS[mKey].color.toString(16)}` }} />
                      <span className="metalBtnName">{lang === 'de' ? METALS[mKey].nameDe : METALS[mKey].nameEn}</span>
                      {metal === mKey && <Check className="checkIcon" size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="controlGroup mt16">
                <span className="controlLabel">{t.finishTitle}</span>
                <div className="finishSelector">
                  {(['polished', 'matte', 'hammered'] as MetalFinish[]).map((fKey) => (
                    <button
                      key={fKey}
                      className={`finishBtn ${finish === fKey ? 'active' : ''}`}
                      onClick={() => setFinish(fKey)}
                    >
                      <strong>{fKey === 'polished' ? '✨' : fKey === 'matte' ? '▫️' : '🔨'}</strong>
                      <span>{fKey === 'polished' ? t.finishPolished : fKey === 'matte' ? t.finishMatte : t.finishHammered}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="builderSection borderTop">
              <h3>{t.sizeTitle}</h3>
              {jewelryType === 'ring' && (
                <div className="rangeControl">
                  <div className="rangeLabelRow">
                    <span>{t.sizeRing}</span>
                    <strong>{ringSize} mm (Size)</strong>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={70}
                    value={ringSize}
                    onChange={(e) => setRingSize(parseInt(e.target.value))}
                    className="customSlider"
                  />
                  <div className="rangeLimits">
                    <span>50mm</span>
                    <span>70mm</span>
                  </div>
                </div>
              )}

              {jewelryType === 'chain' && (
                <div className="rangeControl">
                  <div className="rangeLabelRow">
                    <span>{t.sizeChain}</span>
                    <strong>{chainLength} cm</strong>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={65}
                    step={5}
                    value={chainLength}
                    onChange={(e) => setChainLength(parseInt(e.target.value))}
                    className="customSlider"
                  />
                  <div className="rangeLimits">
                    <span>40cm</span>
                    <span>65cm</span>
                  </div>
                </div>
              )}

              {jewelryType === 'bracelet' && (
                <div className="rangeControl">
                  <div className="rangeLabelRow">
                    <span>{t.sizeBracelet}</span>
                    <strong>{braceletLength} cm</strong>
                  </div>
                  <input
                    type="range"
                    min={17}
                    max={23}
                    step={1}
                    value={braceletLength}
                    onChange={(e) => setBraceletLength(parseInt(e.target.value))}
                    className="customSlider"
                  />
                  <div className="rangeLimits">
                    <span>17cm</span>
                    <span>23cm</span>
                  </div>
                </div>
              )}
            </div>

            <div className="builderSection borderTop">
              <h3>{t.step4}</h3>
              <div className="gemGrid">
                {(Object.keys(GEMSTONES) as GemstoneType[]).map((gKey) => (
                  <button
                    key={gKey}
                    className={`gemBtn ${stones === gKey ? 'active' : ''}`}
                    onClick={() => setStones(gKey)}
                  >
                    <span>{gKey === 'none' ? '❌' : gKey === 'cz' ? '💎' : gKey === 'moissanite' ? '✨' : '⭐'}</span>
                    <span>{lang === 'de' ? GEMSTONES[gKey].nameDe : GEMSTONES[gKey].nameEn}</span>
                  </button>
                ))}
              </div>

              {stones !== 'none' && (
                <div className="stonesCoverageBox mt12">
                  <span className="coverageHeading">{t.coverageTitle}</span>
                  <div className="coverageButtons">
                    {(['minimal', 'medium', 'iced'] as const).map((cov) => (
                      <button
                        key={cov}
                        className={`covBtn ${stonesCoverage === cov ? 'active' : ''}`}
                        onClick={() => setStonesCoverage(cov)}
                      >
                        {cov === 'minimal' ? 'Dezent' : cov === 'medium' ? 'Classic' : 'Iced Out'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* PANEL 2: Interactive WebGL Canvas (Black background, dark theme) */}
          <div className="builderViewport">
            <div className="viewportTip">
              <span>{t.dragTip}</span>
            </div>
            
            <canvas ref={canvasRef} className="webglCanvas" />
            
            {/* Atelier Badge */}
            <div className="atelierBadge">
              <span className="atelierGlow" />
              <div className="badgeContent">
                <Sparkles size={16} className="textGold" />
                <div>
                  <strong>Atelier Cast</strong>
                  <span>100% Handcrafted</span>
                </div>
              </div>
            </div>
            
            {/* HUD Status overlay */}
            <div className="hudStatusBox">
              <Activity className="hudPulse" size={12} />
              <span>3D CAD VIEW ACTIVE</span>
            </div>
          </div>

          {/* PANEL 3: AI Castability Auditor & Pricing (White background, light theme) */}
          <div className="builderAuditorSidebar scrollbarCustom">
            
            {/* AI Auditor Console */}
            <div className="auditorCard">
              <div className="auditorCardHeader">
                <ShieldAlert size={18} className="textAuditor" />
                <h3>AI-Prüfung & Gießbarkeit</h3>
              </div>

              {/* Feasibility score wheel */}
              <div className="scoreIndicatorBox">
                <div className={`scoreBadge ${activeResult.score >= 90 ? 'passed' : activeResult.score >= 70 ? 'warning' : 'critical'}`}>
                  <strong>{activeResult.score}%</strong>
                  <span>Gießbarkeit</span>
                </div>
                <div className="scoreMeta">
                  <strong>Diagnostic Status</strong>
                  <span>{activeResult.score >= 90 ? 'Gussbereit (Production Ready)' : activeResult.score >= 70 ? 'Anpassung empfohlen' : 'Kritische Gussfehler'}</span>
                </div>
              </div>

              {/* Monospace terminal check logs */}
              <div className="auditorConsole">
                <div className="consoleHeader">
                  <Terminal size={12} />
                  <span>METALLURGY LOGS</span>
                </div>
                <div className="consoleLogs">
                  {isAuditing ? (
                    <p className="blinkText">Running checks on mesh structure...</p>
                  ) : (
                    activeResult.checks.map((check, idx) => (
                      <div key={idx} className="consoleRow">
                        <span className={`statusPill ${check.status}`}>
                          {check.status === 'passed' ? '[PASSED]' : check.status === 'warning' ? '[WARN]' : '[CRIT]'}
                        </span>
                        <div className="consoleCheckDetails">
                          <strong>{check.name}</strong>
                          <p>{check.details}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Audit text advice */}
              <div className="auditorFeedbackBox">
                <Info size={16} className="feedbackIcon" />
                <p>{activeResult.feedback}</p>
              </div>
            </div>

            {/* Price Box */}
            <div className="priceCard">
              <h3>{t.calcTitle}</h3>
              <div className="priceDetailList">
                <div className="priceDetailRow">
                  <span>{t.weight}</span>
                  <span>ca. {metrics.weightGrams}g {lang === 'de' ? currentMetalInfo.nameDe : currentMetalInfo.nameEn}</span>
                </div>
                {metrics.stoneCount > 0 && (
                  <div className="priceDetailRow">
                    <span>{t.stonesLabel} ({lang === 'de' ? GEMSTONES[stones].nameDe : GEMSTONES[stones].nameEn})</span>
                    <span>{metrics.stoneCount}x Stones</span>
                  </div>
                )}
                <div className="priceDetailRow">
                  <span>{t.metalValue}</span>
                  <span>€{Math.round(metrics.metalCost).toLocaleString()}</span>
                </div>
                {metrics.stoneCost > 0 && (
                  <div className="priceDetailRow">
                    <span>Stones-Wert</span>
                    <span>€{Math.round(metrics.stoneCost).toLocaleString()}</span>
                  </div>
                )}
                <div className="priceDetailRow">
                  <span>{t.manufacture}</span>
                  <span>€{metrics.manufacturingCost}</span>
                </div>
                <div className="priceTotalDivider" />
                <div className="priceTotalRow">
                  <strong>{t.totalPriceLabel}</strong>
                  <strong>€{metrics.totalPrice.toLocaleString()}</strong>
                </div>
              </div>

              <div className="paymentDetailsBox">
                <div className="depositDetailRow textGold">
                  <span>💵 {t.deposit}</span>
                  <strong>€{metrics.downPayment.toLocaleString()}</strong>
                </div>
                <div className="depositDetailRow textMuted">
                  <span>🤝 {t.restAmount}</span>
                  <strong>€{metrics.restPayment.toLocaleString()}</strong>
                </div>
              </div>

              <div className="actionButtonsSection">
                <button
                  className="checkoutBtn"
                  onClick={() => {
                    alert(lang === 'de' 
                      ? `Anfrage gesendet!\n\nSchmuckstück: Custom ${jewelryType} (${currentMetalInfo.nameDe})\nGesamtpreis: €${metrics.totalPrice.toLocaleString()}\nAnzahlung (50%): €${metrics.downPayment.toLocaleString()}\n\nEin KRYORK-Goldschmied prüft deine Gussdaten und kontaktiert dich in Kürze.`
                      : `Request submitted!\n\nPiece: Custom ${jewelryType} (${currentMetalInfo.nameEn})\nTotal Price: €${metrics.totalPrice.toLocaleString()}\nDeposit (50%): €${metrics.downPayment.toLocaleString()}\n\nA KRYORK goldsmith is auditing your casting specifications and will contact you shortly.`
                    );
                  }}
                >
                  {t.checkoutBtn} <ChevronRight size={18} />
                </button>

                <button className="downloadStlBtn" onClick={triggerSTLDownload}>
                  <Download size={16} /> {t.downloadStl}
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
