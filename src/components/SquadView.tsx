import React, { useState, useMemo } from 'react';
import { 
  Search, Award, Download, FileText, User, Calendar, 
  Hash, CreditCard, ShieldCheck, CheckCircle, Users, ExternalLink, X, HelpCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { Contract } from '../types';
import { generateContractPDF, generateBidCardPDF, formatCurrency, formatDateBr } from '../utils/pdfGenerator';

interface SquadViewProps {
  contracts: Contract[];
  onNavigateToSign: (code: string) => void;
}

// Group positions into standard tactical categories
function getPositionCategory(pos: string): string {
  const p = pos.toLowerCase();
  if (p.includes('goleiro') || p.includes('gk') || p.includes('arq')) {
    return 'Goleiros';
  }
  if (
    p.includes('zagueiro') || 
    p.includes('lateral') || 
    p.includes('defesa') || 
    p.includes('defensor') || 
    p.includes('zg') || 
    p.includes('lat') ||
    p.includes('ld') ||
    p.includes('le')
  ) {
    return 'Defensores';
  }
  if (
    p.includes('volante') || 
    p.includes('meio') || 
    p.includes('meia') || 
    p.includes('mc') || 
    p.includes('vol') ||
    p.includes('armador')
  ) {
    return 'Meio-Campistas';
  }
  if (
    p.includes('atacante') || 
    p.includes('ponta') || 
    p.includes('centroavante') || 
    p.includes('centroovante') || 
    p.includes('ata') || 
    p.includes('pe') || 
    p.includes('pd') ||
    p.includes('avante')
  ) {
    return 'Atacantes';
  }
  return 'Meio-Campistas'; // default back to midfield
}

// Return 3 letters abbreviated indicator for the FIFA Card
function getPositionAbbreviation(pos: string): string {
  const p = pos.toLowerCase();
  if (p.includes('goleiro')) return 'GOL';
  if (p.includes('zagueiro') || p.includes('zg')) return 'ZAG';
  if (p.includes('lateral') || p.includes('lat')) return 'LAT';
  if (p.includes('volante') || p.includes('vol')) return 'VOL';
  if (p.includes('meio-campo') || p.includes('mc')) return 'MC';
  if (p.includes('meia') || p.includes('mei')) return 'MEI';
  if (p.includes('atacante') || p.includes('ata')) return 'ATA';
  if (p.includes('ponta') || p.includes('pe') || p.includes('pd')) return 'PON';
  if (p.includes('centroavante') || p.includes('avante') || p.includes('ca')) return 'CA';
  return pos.slice(0, 3).toUpperCase();
}

// FUT stats representation
interface FutStats {
  ovr: number;
  stat1Label: string; stat1Val: number;
  stat2Label: string; stat2Val: number;
  stat3Label: string; stat3Val: number;
  stat4Label: string; stat4Val: number;
  stat5Label: string; stat5Val: number;
  stat6Label: string; stat6Val: number;
}

// Deterministically generate beautiful FUT stats so they remain stable on re-renders
function getFutStatsForPlayer(name: string, position: string, overrideOvr?: number): FutStats {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const getVal = (min: number, max: number, offset: number) => {
    return min + Math.abs((hash + offset) % (max - min + 1));
  };

  const cat = getPositionCategory(position);
  const isGK = cat === 'Goleiros';
  
  // High quality athletes (83-93 rating range or admin override)
  const ovr = overrideOvr || getVal(84, 95, 12);
  
  if (isGK) {
    return {
      ovr,
      stat1Label: 'PAC', stat1Val: getVal(ovr - 4, ovr + 2, 1), // Elasticidade
      stat2Label: 'HAN', stat2Val: getVal(ovr - 3, ovr + 3, 2), // Firmeza
      stat3Label: 'KIC', stat3Val: getVal(ovr - 12, ovr + 1, 3), // Chute de goleiro
      stat4Label: 'REF', stat4Val: getVal(ovr - 2, ovr + 4, 4), // Reflexos
      stat5Label: 'SPD', stat5Val: getVal(48, 76, 5),          // Velocidade
      stat6Label: 'POS', stat6Val: getVal(ovr - 5, ovr + 2, 6)  // Posicionamento
    };
  } else {
    const isDef = cat === 'Defensores';
    const isMid = cat === 'Meio-Campistas';
    
    return {
      ovr,
      stat1Label: 'PAC', stat1Val: getVal(isDef ? 68 : 84, 95, 11), // Ritmo
      stat2Label: 'SHO', stat2Val: getVal(isDef ? 38 : isMid ? 73 : 83, 93, 22), // Chute
      stat3Label: 'PAS', stat3Val: getVal(isDef ? 62 : 82, 94, 33), // Passe
      stat4Label: 'DRI', stat4Val: getVal(isDef ? 58 : isMid ? 83 : 87, 95, 44), // Drible
      stat5Label: 'DEF', stat5Val: getVal(isDef ? 85 : 55, 93, 55), // Defesa
      stat6Label: 'PHY', stat6Val: getVal(isDef ? 84 : 68, 91, 66)  // Físico
    };
  }
}

// Age calculator helper
function calculateAge(birthDateString?: string): number {
  if (!birthDateString) return 0;
  const today = new Date();
  const birthDate = new Date(birthDateString);
  if (isNaN(birthDate.getTime())) return 0;
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// 3D Tilt FUT Card Component
function FutCard({ 
  player, 
  onClick 
}: { 
  player: Contract; 
  onClick: () => void; 
  key?: string | number;
}) {
  const fut = getFutStatsForPlayer(player.playerName, player.position, player.overallRating);
  const abbrevPos = getPositionAbbreviation(player.position);
  
  // 3D tilt interaction states
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    
    // Convert to percentage for subtle glare reflection position
    const px = (x / box.width) * 100;
    const py = (y / box.height) * 105;
    setGlarePosition({ x: px, y: py });

    // Calculate rotation between -12 and +12 degrees
    const rY = ((x / box.width) - 0.5) * 24; 
    const rX = -(((y / box.height) - 0.5) * 24);
    
    setRotateX(rX);
    setRotateY(rY);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div 
      onClick={onClick}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 20 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative cursor-pointer select-none focus:outline-none focus:ring-4 focus:ring-amber-500/40 rounded-[28px] transition-all duration-300"
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
    >
      {/* FUT Ultimate Team True Golden Shield Wrapper with interactive 3D transform */}
      <div 
        className="w-[260px] h-[370px] relative bg-gradient-to-b from-[#ffebaa] via-[#dfb646] to-[#7c560f] p-[3px] shadow-lg transition-all duration-150 ease-out overflow-hidden"
        style={{ 
          clipPath: 'polygon(12% 0%, 88% 0%, 100% 11%, 100% 78%, 50% 100%, 0% 78%, 0% 11%)',
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${isHovered ? 1.05 : 1}, ${isHovered ? 1.05 : 1}, 1)`,
          boxShadow: isHovered ? '0 30px 60px rgba(212, 175, 55, 0.45)' : '0 10px 25px rgba(0,0,0,0.15)',
        }}
      >
        {/* Inner Card Solid Gold Body */}
        <div 
          className="w-full h-full relative bg-gradient-to-b from-[#fff6d1] via-[#e6bc5a] to-[#a37c22] p-4 flex flex-col justify-between text-[#322105] font-sans overflow-hidden"
          style={{ clipPath: 'polygon(12% 0%, 88% 0%, 100% 11%, 100% 78%, 50% 100%, 0% 78%, 0% 11%)' }}
        >
          
          {/* Interactive Glare / Holographic Reflection effect */}
          <div 
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{
              opacity: isHovered ? 0.35 : 0.15,
              background: `radial-gradient(ellipse 130px 130px at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.75) 0%, rgba(255,255,255,0) 80%)`,
            }}
          />
          <div className="absolute top-0 right-0 w-full h-full bg-no-repeat bg-[linear-gradient(135deg,_transparent_30%,_rgba(255,255,255,0.25)_40%,_rgba(255,255,255,0.05)_50%,_transparent_60%)] pointer-events-none" />
          
          {/* FIFA Card Top Header Section */}
          <div className="flex justify-between items-start mt-1 relative z-10 w-full h-[52%]">
            {/* OVR + POS + Flag Column */}
            <div className="flex flex-col items-center pl-1.5 pt-1.5 font-mono tracking-tighter shrink-0">
              <span className="text-4xl font-extrabold leading-none select-none text-[#322105] drop-shadow-xs">
                {fut.ovr}
              </span>
              <span className="text-[11px] font-black tracking-widest leading-none mt-1 text-[#4e340a] border-b border-[#322105]/20 pb-1 w-10 text-center">
                {abbrevPos}
              </span>
              
              {/* National Flag (Pristine Vector SVG Brazil Flag) */}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 720 504" 
                className="w-7 h-5 rounded-xs mt-2.5 shadow-xs border border-[#d4af37]/50" 
                title="Nacionalidade: Brasil"
              >
                <rect width="720" height="504" fill="#009739"/>
                <path d="M360 81L639 252 360 423 81 252z" fill="#fedd00"/>
                <circle cx="360" cy="252" r="102" fill="#002776"/>
                <path d="M228 322.5c20-67 114-118.5 242-118.5 20.5 0 40 1 58.5 3-19.5-6.5-40-10-62-10-128 0-222 51.5-242 118.5z" fill="#fff"/>
              </svg>
              
              {/* BILAU LOMBRADO custom circular shield badge */}
              <div className="w-6.5 h-6.5 rounded-full overflow-hidden mt-2.5 border border-[#d4af37]/60 shadow-md relative group-hover:scale-110 transition-transform duration-300 flex items-center justify-center bg-[#1e1911]">
                <img 
                  src="/logo.png" 
                  alt="Bilau Lombrado FC" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain p-0.5"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "https://i.imgur.com/8HSE8i8.png";
                  }}
                />
              </div>

              {/* Individual Player Age Indicator */}
              {player.birthDate && (
                <div className="flex flex-col items-center mt-2 font-mono leading-none">
                  <span className="text-xs font-black tracking-tight text-[#322105]">
                    {calculateAge(player.birthDate)}
                  </span>
                  <span className="text-[7px] font-black uppercase tracking-widest text-[#4e340a]/70">
                    ANOS
                  </span>
                </div>
              )}
            </div>

            {/* Beautiful headshot representation with border highlight */}
            <div className="relative mr-1.5 pt-1 pr-1 shrink-0" style={{ transform: 'translateZ(20px)' }}>
              {player.photoDataUrl ? (
                <div className="w-[124px] h-[142px] rounded-2xl overflow-hidden bg-gradient-to-b from-[#fffae8]/10 to-[#f6d058]/20 border-2 border-[#d4af37]/65 shadow-md flex items-center justify-center relative">
                  <img 
                    src={player.photoDataUrl} 
                    alt={player.playerName} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top filter contrast-[1.03] brightness-[1.01]"
                  />
                </div>
              ) : (
                <div className="w-[124px] h-[142px] rounded-2xl bg-gradient-to-b from-[#fffdfa]/30 to-[#eabb4c]/40 border-2 border-[#d4af37]/55 flex items-center justify-center text-[#322105]/30 relative shadow-inner">
                  <User className="w-[70px] h-[70px] drop-shadow-sm text-[#4e340a]" />
                </div>
              )}
              
              {player.shirtNumber && (
                <span className="absolute bottom-1 -right-1 bg-[#1e1403] text-[#facc15] text-[9px] font-black px-1.5 py-0.5 rounded-md border border-[#d4af37]/65 shadow-md">
                  CAMISA {player.shirtNumber}
                </span>
              )}
            </div>
          </div>

          {/* Divider line style */}
          <div className="w-[85%] h-[1.5px] bg-gradient-to-r from-transparent via-[#322105]/20 to-transparent mx-auto mt-1 relative z-10" />

          {/* Player Centered Name Block with gold glow background */}
          <div className="text-center py-1 mt-0.5 relative z-10 bg-gradient-to-r from-transparent via-[#ffd361]/15 to-transparent" style={{ transform: 'translateZ(10px)' }}>
            <h4 className="font-extrabold text-[#322105] drop-shadow-xs tracking-tight uppercase line-clamp-1 px-1 transition-colors">
              {player.playerName}
            </h4>
          </div>

          {/* FUT Detailed Stats Subsection */}
          <div className="px-5 pb-5 shrink-0 relative z-10" style={{ transform: 'translateZ(15px)' }}>
            <div className="grid grid-cols-2 gap-y-0.5 text-xs border-t border-[#322105]/15 pt-1.5 font-mono font-black text-[#4e340a]">
              
              {/* Left Stats Column */}
              <div className="flex flex-col gap-0.5 pr-3 border-r border-[#322105]/15">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-[#322105]/65 font-bold">{fut.stat1Label}</span>
                  <span className="font-extrabold text-[#322105]">{fut.stat1Val}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-[#322105]/65 font-bold">{fut.stat2Label}</span>
                  <span className="font-extrabold text-[#322105]">{fut.stat2Val}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-[#322105]/65 font-bold">{fut.stat3Label}</span>
                  <span className="font-extrabold text-[#322105]">{fut.stat3Val}</span>
                </div>
              </div>

              {/* Right Stats Column */}
              <div className="flex flex-col gap-0.5 pl-3">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-[#322105]/65 font-bold">{fut.stat4Label}</span>
                  <span className="font-extrabold text-[#322105]">{fut.stat4Val}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-[#322105]/65 font-bold">{fut.stat5Label}</span>
                  <span className="font-extrabold text-[#322105]">{fut.stat5Val}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-[#322105]/65 font-bold">{fut.stat6Label}</span>
                  <span className="font-extrabold text-[#322105]">{fut.stat6Val}</span>
                </div>
              </div>

            </div>

            {/* CBF Seal Watermark */}
            <div className="flex items-center justify-center gap-1.5 text-[8.5px] font-black text-[#5e410a]/50 uppercase tracking-widest mt-3.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#322105]/50" />
              <span>ATLETA ELITE CBF</span>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}

export default function SquadView({ contracts, onNavigateToSign }: SquadViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Contract | null>(null);

  // Filter signed athletes
  const signedPlayers = useMemo(() => {
    return contracts.filter(c => c.status === 'SIGNED');
  }, [contracts]);

  // Filter based on search query
  const filteredPlayers = useMemo(() => {
    return signedPlayers.filter(p => {
      const query = searchTerm.toLowerCase();
      return (
        p.playerName.toLowerCase().includes(query) ||
        p.position.toLowerCase().includes(query) ||
        (p.code && p.code.toLowerCase().includes(query))
      );
    });
  }, [signedPlayers, searchTerm]);

  // Group players by tactical category
  const groupedPlayers = useMemo(() => {
    const groups: { [key: string]: Contract[] } = {
      'Goleiros': [],
      'Defensores': [],
      'Meio-Campistas': [],
      'Atacantes': []
    };

    filteredPlayers.forEach(p => {
      const cat = getPositionCategory(p.position);
      // Fallback if anything maps outside
      if (groups[cat]) {
        groups[cat].push(p);
      } else {
        groups['Meio-Campistas'].push(p);
      }
    });

    return groups;
  }, [filteredPlayers]);

  const stats = useMemo(() => {
    return {
      total: signedPlayers.length,
      goleiros: signedPlayers.filter(p => getPositionCategory(p.position) === 'Goleiros').length,
      defensores: signedPlayers.filter(p => getPositionCategory(p.position) === 'Defensores').length,
      meioCampistas: signedPlayers.filter(p => getPositionCategory(p.position) === 'Meio-Campistas').length,
      atacantes: signedPlayers.filter(p => getPositionCategory(p.position) === 'Atacantes').length,
    };
  }, [signedPlayers]);

  const handleDownloadContract = async (e: React.MouseEvent, player: Contract) => {
    e.stopPropagation();
    try {
      await generateContractPDF(player);
    } catch (err) {
      console.error('Falha ao baixar contrato PDF:', err);
      alert('Não foi possível gerar o PDF do contrato.');
    }
  };

  const handleDownloadBidCard = async (e: React.MouseEvent, player: Contract) => {
    e.stopPropagation();
    try {
      await generateBidCardPDF(player);
    } catch (err) {
      console.error('Falha ao baixar carteira BID:', err);
      alert('Não foi possível gerar a carteira do BID.');
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      
      {/* Club Billboard / Poster */}
      <div className="relative overflow-hidden bg-gradient-to-br from-red-950 via-[#180307] to-black text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-red-900/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/15 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-semibold text-amber-400 tracking-wide uppercase font-mono">
              <Award className="w-3.5 h-3.5" /> Elenco Principal BILAU LOMBRADO FC
            </div>
            <h2 className="text-3xl sm:text-4.5xl font-black tracking-tight leading-none bg-gradient-to-r from-amber-200 via-amber-100 to-amber-400 bg-clip-text text-transparent">
              Todos os Membros do Elenco
            </h2>
            <p className="text-sm text-stone-300 max-w-xl font-medium leading-relaxed">
              Estes são todos os guerreiros e craques registrados oficialmente que entram em campo defendendo o Bilau Lombrado FC. Clique na carta de qualquer atleta para ver os dados do contrato, assinatura digital e baixar a carteirinha oficial do BID.
            </p>
          </div>

          <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-3 bg-[#180509]/80 p-4 rounded-2xl border border-red-900/30 backdrop-blur-md shrink-0">
            <div className="text-center px-4 border-r border-red-900/40">
              <span className="text-2xl sm:text-3xl font-black text-amber-400 block tracking-tight">{stats.total}</span>
              <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-widest block">Elenco</span>
            </div>
            <div className="text-center px-4 border-r border-red-900/40">
              <span className="text-md sm:text-lg font-black text-stone-200 block tracking-tight">{stats.goleiros}</span>
              <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">GOL</span>
            </div>
            <div className="text-center px-4 border-r border-red-900/40">
              <span className="text-md sm:text-lg font-black text-stone-200 block tracking-tight">{stats.defensores}</span>
              <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">DEF</span>
            </div>
            <div className="text-center px-4 border-r border-red-900/40">
              <span className="text-md sm:text-lg font-black text-stone-200 block tracking-tight">{stats.meioCampistas}</span>
              <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">MEI</span>
            </div>
            <div className="text-center px-4">
              <span className="text-md sm:text-lg font-black text-stone-200 block tracking-tight">{stats.atacantes}</span>
              <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider block">ATA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Database Search Hub */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-[#140609] p-4.5 rounded-2xl border border-stone-200 dark:border-red-950/60 shadow-xs transition-colors duration-200">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-400 dark:text-stone-500" />
          <input
            type="text"
            placeholder="Buscar jogador no elenco por nome ou posição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10.5 pr-4 py-2.5 bg-stone-50 dark:bg-[#070103] border border-stone-200 dark:border-red-950/60 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-medium text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 font-bold text-xs bg-stone-200 dark:bg-red-950/60 rounded-full w-5 h-5 flex items-center justify-center transition-all cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
        <div className="text-xs text-stone-400 dark:text-stone-500 font-bold tracking-wider uppercase shrink-0 bg-stone-100 dark:bg-[#080204] px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-transparent dark:border-red-950/60">
          <span>Atletas Filtrados:</span>
          <span className="text-stone-800 dark:text-stone-300 font-black">{filteredPlayers.length}</span>
        </div>
      </div>

      {/* Structured Tactical Positions Sections */}
      {filteredPlayers.length > 0 ? (
        <div className="space-y-12">
          
          {(Object.keys(groupedPlayers) as Array<keyof typeof groupedPlayers>).map((category) => {
            const players = groupedPlayers[category];
            if (players.length === 0) return null;

            return (
              <div key={category} className="space-y-6">
                
                {/* Sector Header */}
                <div className="flex items-center gap-3 border-b border-slate-250 dark:border-slate-800 pb-2.5">
                  <span className="w-1.5 h-6 bg-amber-500 rounded-full" />
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                    {category}
                  </h3>
                  <span className="text-xs font-bold text-slate-405 dark:text-slate-450 bg-slate-150 dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md">
                    {players.length} {players.length === 1 ? 'jogador' : 'jogadores'}
                  </span>
                </div>

                {/* FUT Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center">
                  {players.map((player) => (
                    <FutCard 
                      key={player.id} 
                      player={player} 
                      onClick={() => setSelectedPlayer(player)} 
                    />
                  ))}
                </div>

              </div>
            );
          })}

        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-xl mx-auto space-y-5 shadow-xs">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-200">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Nenhuma Assinatura Registrada</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              {searchTerm 
                ? "Nenhum atleta assinado atende ao filtro digitado." 
                : "Ainda não constam jogadores com contratos assinados no sistema do clube. Quando novos atletas assinarem pelo celular ou PC, suas cartinhas FIFA aparecerão automaticamente aqui!"
              }
            </p>
          </div>
          
          {!searchTerm && (
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 justify-center">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">Dica operacional:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => onNavigateToSign('BL-1010')}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Assinar Gabriel (BL-1010)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expanded Athlete Detail Overlay Modal (Directly displays PDF Documents printing options and full private dossier) */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-[#0a0204]/85 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#140609] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-150 dark:border-red-950/60 relative animate-scale-up">
            
            {/* Header branding block */}
            <div className="bg-gradient-to-br from-red-950 to-[#0e0305] text-white p-6 relative">
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full p-1.5 transition-colors cursor-pointer animate-pulse"
                aria-label="Reforço Close"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4">
                {selectedPlayer.photoDataUrl ? (
                  <img 
                    src={selectedPlayer.photoDataUrl} 
                    alt={selectedPlayer.playerName}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-amber-400 object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-650 flex items-center justify-center text-slate-400 shrink-0">
                    <User className="w-8 h-8" />
                  </div>
                )}
                
                <div>
                  <span className="bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                    Camisa {selectedPlayer.shirtNumber || 'N/D'}
                  </span>
                  <h3 className="text-lg font-black tracking-tight">{selectedPlayer.playerName}</h3>
                  <p className="text-xs text-slate-405 font-medium">{selectedPlayer.position}</p>
                </div>
              </div>
            </div>

            {/* Private Dossier area containing BID & Contract Downloads */}
            <div className="p-6 space-y-5">
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4.5 h-4.5 text-amber-505" />
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Identidade e Documentos CBF</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-stone-50 dark:bg-[#070103] p-3 rounded-2xl border border-stone-100 dark:border-red-950/60">
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 font-extrabold uppercase tracking-wide block mb-0.5">Inscrição CBF (BID)</span>
                    <span className="text-sm font-bold text-stone-800 dark:text-stone-200 font-mono">{selectedPlayer.bidNumber || 'Gerando no BID'}</span>
                  </div>
                  <div className="bg-stone-50 dark:bg-[#070103] p-3 rounded-2xl border border-stone-100 dark:border-red-950/60">
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 font-extrabold uppercase tracking-wide block mb-0.5">Protocolo de Vínculo</span>
                    <span className="text-sm font-bold text-stone-800 dark:text-stone-200 font-mono">{selectedPlayer.bidProtocol || 'Automático'}</span>
                  </div>
                  <div className="bg-stone-50 dark:bg-[#070103] p-3 rounded-2xl border border-stone-100 dark:border-red-950/60">
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 font-extrabold uppercase tracking-wide block mb-0.5">Idade</span>
                    <span className="text-sm font-bold text-stone-800 dark:text-stone-200">{selectedPlayer.birthDate ? `${calculateAge(selectedPlayer.birthDate)} anos` : 'Não Fornecido'}</span>
                  </div>
                  <div className="bg-stone-50 dark:bg-[#070103] p-3 rounded-2xl border border-stone-100 dark:border-red-950/60">
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 font-extrabold uppercase tracking-wide block mb-0.5">Homologação no Clube</span>
                    <span className="text-sm font-bold text-stone-800 dark:text-stone-200">{selectedPlayer.signedAt ? formatDateBr(selectedPlayer.signedAt) : 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-stone-100 dark:border-red-950/60">
                <h4 className="text-xs font-black text-stone-400 dark:text-stone-500 uppercase tracking-wider">Cláusulas e Trabalho</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 font-extrabold uppercase tracking-wider block mb-0.5">Salário Homologado</span>
                    <span className="text-sm font-black text-stone-900 dark:text-white">{formatCurrency(selectedPlayer.salary)}/mês</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 font-extrabold uppercase tracking-wider block mb-0.5">Início do Trabalho</span>
                    <span className="text-sm font-black text-stone-900 dark:text-white">{selectedPlayer.startDate ? formatDateBr(selectedPlayer.startDate) : 'Na assinatura'}</span>
                  </div>
                </div>
              </div>

              {selectedPlayer.notes && (
                <div className="pt-4 border-t border-stone-100 dark:border-red-950/60 space-y-1.5">
                  <h4 className="text-xs font-black text-stone-400 dark:text-stone-500 uppercase tracking-wider font-mono">Acordos Internos</h4>
                  <p className="text-xs text-stone-600 dark:text-stone-300 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl font-medium leading-relaxed border border-amber-500/10">
                    {selectedPlayer.notes}
                  </p>
                </div>
              )}

              {/* Secure autograph preview */}
              {selectedPlayer.signatureDataUrl && (
                <div className="pt-4 border-t border-stone-100 dark:border-red-950/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-stone-400 dark:text-stone-500 uppercase tracking-wider">Assinatura Certificada pelo Jogador</h4>
                  </div>
                  <div className="h-20 bg-stone-50 dark:bg-[#070103] border border-stone-200/80 dark:border-red-950/60 rounded-2xl flex items-center justify-center p-3 relative overflow-hidden">
                    <img 
                      src={selectedPlayer.signatureDataUrl} 
                      alt="Assinatura" 
                      className="max-h-full max-w-full object-contain pointer-events-none select-none filter contrast-125 dark:invert dark:hue-rotate-180" 
                    />
                  </div>
                </div>
              )}

              {/* Action area to download contracts securely */}
              <div className="pt-5 border-t border-stone-200/80 dark:border-red-950/60 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    handleDownloadBidCard(e, selectedPlayer);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 text-amber-300 py-3 px-4 rounded-xl text-xs font-black tracking-wider uppercase transition-all shadow-sm hover:shadow-md cursor-pointer select-none border border-amber-500/30"
                >
                  <CreditCard className="w-4.5 h-4.5 text-amber-300" />
                  <span>Baixar Carteira Oficial do BID</span>
                </button>
              </div>

            </div>

            {/* Bottom block */}
            <div className="bg-stone-50 dark:bg-[#070103] px-6 py-4.5 text-center border-t border-stone-150 dark:border-red-950/60">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest block font-mono">BILAU LOMBRADO FC • SISTEMA PROFISSIONAL INTEGRADO</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
