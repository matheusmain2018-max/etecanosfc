import React, { useState, useEffect } from 'react';
import { 
  FileSignature, Settings, ShieldAlert, Award, ChevronRight, 
  Linkedin, Github, HelpCircle, GraduationCap, Check, HelpCircle as HelpIcon,
  Users, Sun, Moon
} from 'lucide-react';
import { Contract, ActiveTab } from './types';
import TeamLogo from './components/TeamLogo';
import PlayerView from './components/PlayerView';
import AdminPanel from './components/AdminPanel';
import SquadView from './components/SquadView';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

// Simulated initial templates to populate empty Firestore database
const INITIAL_CONTRACTS: Contract[] = [
  {
    id: 'contract-demo-1',
    playerName: 'Gabriel Barbosa Silva',
    position: 'Centroavante',
    salary: 5000,
    durationMonths: 12,
    startDate: '2026-06-01',
    shirtNumber: 9,
    notes: 'Bônus coletivo de R$ 300,00 por gol marcado na divisão regional.',
    code: 'ETEC-1010',
    status: 'PENDING'
  },
  {
    id: 'contract-demo-2',
    playerName: 'Alisson Becker Santos',
    position: 'Goleiro',
    salary: 4500,
    durationMonths: 24,
    startDate: '2026-05-01',
    shirtNumber: 1,
    notes: 'Multa rescisória de 10x sobre o valor do salário base.',
    code: 'ETEC-2020',
    status: 'SIGNED',
    signedAt: '2026-05-19T14:30:00Z',
    signatureDataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><path d="M10,20 Q30,5 50,20 T90,20" fill="none" stroke="%23002B49" stroke-width="2"/></svg>'
  }
];

const SYSTEM_SETUP_ID = 'contract-system-setup';
const SYSTEM_SETUP_CONTRACT: Contract = {
  id: SYSTEM_SETUP_ID,
  playerName: 'SYSTEM_SETUP_MARKER',
  position: 'Volante',
  salary: 1,
  durationMonths: 1,
  startDate: '2026-05-20',
  code: 'SYSTEM-SETUP',
  status: 'PENDING'
};

export default function App() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('elenco');
  const [isReady, setIsReady] = useState(false);
  const [playerViewInitialCode, setPlayerViewInitialCode] = useState('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('darkMode') === 'true';
    } catch (e) {
      console.warn('localStorage read blocked or unavailable on this browser:', e);
      return false;
    }
  });

  // Track and apply doc dark mode state dynamically securely
  useEffect(() => {
    try {
      localStorage.setItem('darkMode', darkMode.toString());
    } catch (e) {
      console.warn('localStorage write blocked or unavailable on this browser:', e);
    }
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleNavigateToSign = (code: string) => {
    setPlayerViewInitialCode(code);
    setActiveTab('player');
  };

  // Load contracts from Firestore in real-time
  useEffect(() => {
    const contractsQuery = collection(db, 'contracts');
    
    const unsubscribe = onSnapshot(contractsQuery, async (snapshot) => {
      setConnectionError(null);
      const loaded: Contract[] = [];
      snapshot.forEach((docSnap) => {
        loaded.push(docSnap.data() as Contract);
      });
      
      if (loaded.length === 0) {
        // If Firestore is empty, initialize it with persistent system marker and standard defaults
        try {
          await setDoc(doc(db, 'contracts', SYSTEM_SETUP_ID), SYSTEM_SETUP_CONTRACT);
          for (const contract of INITIAL_CONTRACTS) {
            await setDoc(doc(db, 'contracts', contract.id), contract);
          }
        } catch (e) {
          console.error('Falha ao inicializar base do Firestore:', e);
          // Graceful local fallback if write fails on block/permissions
          setContracts(INITIAL_CONTRACTS);
          setIsReady(true);
        }
      } else {
        // Proactively insert the system setup marker if it is missing from legacy databases
        const hasMarker = loaded.some(c => c.id === SYSTEM_SETUP_ID);
        if (!hasMarker) {
          try {
            await setDoc(doc(db, 'contracts', SYSTEM_SETUP_ID), SYSTEM_SETUP_CONTRACT);
          } catch (e) {
            console.error('Falha ao criar marcador de inicializacao no Firestore:', e);
          }
        }

        // Filter out the system marker so it never shows up in the UI
        const visible = loaded.filter(c => c.id !== SYSTEM_SETUP_ID);
        // Sort contracts (newest first based on creation date id index)
        visible.sort((a, b) => b.id.localeCompare(a.id));
        setContracts(visible);
        setIsReady(true);
      }
    }, (error) => {
      console.warn('Firestore real-time subscription blocked or failed. Activating local template storage fallback:', error);
      // Fallback securely to starting templates so the user can still use the app in offline/blocked environments!
      setConnectionError(error instanceof Error ? error.message : String(error));
      setContracts(INITIAL_CONTRACTS);
      setIsReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Add / Generate contract handler targeting database
  const handleAddContract = async (newContractData: Omit<Contract, 'id' | 'code' | 'status'>) => {
    // Generate a unique code (E.g. ETEC-3819)
    let generatedCode = '';
    let isUnique = false;
    
    while (!isUnique) {
      const randNum = Math.floor(1000 + Math.random() * 9000); // 4 digitos
      generatedCode = `ETEC-${randNum}`;
      isUnique = !contracts.some(c => c.code === generatedCode);
    }

    const id = `contract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newContract: Contract = {
      ...newContractData,
      id,
      code: generatedCode,
      status: 'PENDING'
    };

    // Clean keys with undefined values to prevent Firestore from throwing "Unsupported field value: [object Object]" or similar crashes
    const cleanedContract = Object.fromEntries(
      Object.entries(newContract).filter(([_, v]) => v !== undefined)
    ) as Contract;

    try {
      await setDoc(doc(db, 'contracts', id), cleanedContract);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `contracts/${id}`);
    }
  };

  // Delete/Invalidate Contract handler targeting database
  const handleDeleteContract = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'contracts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `contracts/${id}`);
    }
  };

  // Sign contract handler targeting database
  const handleSignContract = async (
    id: string, 
    signatureDataUrl: string, 
    extraData?: { birthDate?: string; photoDataUrl?: string; bidNumber?: string; bidProtocol?: string }
  ) => {
    try {
      const updateData: any = {
        status: 'SIGNED',
        signatureDataUrl,
        signedAt: new Date().toISOString(),
      };
      if (extraData) {
        if (extraData.birthDate !== undefined) updateData.birthDate = extraData.birthDate;
        if (extraData.photoDataUrl !== undefined) updateData.photoDataUrl = extraData.photoDataUrl;
        if (extraData.bidNumber !== undefined) updateData.bidNumber = extraData.bidNumber;
        if (extraData.bidProtocol !== undefined) updateData.bidProtocol = extraData.bidProtocol;
      }
      await updateDoc(doc(db, 'contracts', id), updateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `contracts/${id}`);
    }
  };

  // Update contract Overall Rating handler targeting database
  const handleUpdateOverall = async (id: string, newOverall: number) => {
    try {
      await updateDoc(doc(db, 'contracts', id), {
        overallRating: newOverall
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `contracts/${id}`);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Aguarde, carregando ETECANOS FC...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col text-slate-800 dark:text-slate-100 transition-colors duration-200 antialiased font-sans">
      
      {/* Visual top accent line representing primary colors: white + light blue gradient */}
      <div className="h-1.5 bg-gradient-to-r from-sky-400 via-white to-sky-400 dark:from-sky-500 dark:via-slate-850 dark:to-sky-500 w-full" />

      {/* Graceful Connection Fallback Alert for Adblock / Private Mobile Browsing */}
      {connectionError && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-[11px] sm:text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all animate-fade-in relative z-50 select-none">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            <strong>Modo Demonstrativo Ativo:</strong> A conexão com o banco de dados foi limitada pelo seu dispositivo (ou bloqueada por adblock/modo privado). O site carregou um banco de dados local para você poder interagir!
          </span>
        </div>
      )}

      {/* Main Layout Header banner */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between py-3.5 sm:py-4 gap-4">
            
            {/* Club Brand branding Section */}
            <div className="flex items-center gap-3.5 select-none hover:opacity-95 transition-opacity">
              <TeamLogo size="md" />
              <div className="text-center sm:text-left">
                <span className="text-[10px] uppercase font-black text-sky-600 dark:text-sky-400 tracking-widest block font-mono">Clube de Futebol</span>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">ETECANOS FC</h1>
                <p className="text-[11px] text-slate-400 dark:text-slate-300 font-medium">Assinatura Digital de Elenco Profissional</p>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
              <div className="flex-grow sm:flex-grow-0 flex flex-wrap items-center bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 w-full sm:w-auto gap-1">
                {/* Elenco tab (Home Page) */}
                <button
                  id="view-tab-elenco"
                  type="button"
                  onClick={() => {
                    setActiveTab('elenco');
                    setPlayerViewInitialCode('');
                  }}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4.5 py-2.5 text-xs md:text-sm font-black rounded-xl transition-all select-none cursor-pointer ${
                    activeTab === 'elenco'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Elenco Oficial</span>
                </button>

                {/* Discreet Divider */}
                <div className="hidden sm:block w-px h-5 bg-slate-300 dark:bg-slate-800 mx-1.5" />

                {/* Jogador tab (Secondary) */}
                <button
                  id="view-tab-player"
                  type="button"
                  onClick={() => {
                    setActiveTab('player');
                    setPlayerViewInitialCode('');
                  }}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all select-none cursor-pointer ${
                    activeTab === 'player'
                      ? 'bg-slate-800 dark:bg-slate-800 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-amber-400 hover:bg-slate-200/40 dark:hover:bg-slate-900/40'
                  }`}
                  title="Área reservada para o Atleta assinar o contrato"
                >
                  <FileSignature className="w-3.5 h-3.5" />
                  <span>Espaço Atleta</span>
                </button>

                {/* Administrador tab (Secondary) */}
                <button
                  id="view-tab-admin"
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setPlayerViewInitialCode('');
                  }}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all select-none cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-slate-800 dark:bg-slate-800 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-amber-400 hover:bg-slate-200/40 dark:hover:bg-slate-900/40'
                  }`}
                  title="Painel de Controle e Contratos da Diretoria"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Diretoria</span>
                </button>
              </div>

              {/* Dark Mode Toggle Switch */}
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer shadow-xs flex items-center justify-center"
                title={darkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Body viewports switching based on active tab state */}
      <main className="flex-grow py-6 px-4 md:px-6 max-w-7xl mx-auto w-full">
        {activeTab === 'elenco' && (
          <SquadView 
            contracts={contracts}
            onNavigateToSign={handleNavigateToSign}
          />
        )}
        
        {activeTab === 'player' && (
          <PlayerView 
            contracts={contracts} 
            onSignContract={handleSignContract}
            initialCode={playerViewInitialCode}
          />
        )}
        
        {activeTab === 'admin' && (
          <AdminPanel 
            contracts={contracts} 
            onAddContract={handleAddContract}
            onDeleteContract={handleDeleteContract}
            onUpdateOverall={handleUpdateOverall}
          />
        )}
      </main>

      {/* Modern, non-cluttered humble footer credits */}
      <footer className="mt-12 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-500 transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-200 dark:bg-sky-950 border border-sky-400 dark:border-sky-500 shrink-0" />
            <span>© {new Date().getFullYear()} ETECANOS FC. Todos os direitos reservados.</span>
          </div>
          <div className="flex items-center gap-2.5 justify-center font-medium">
            <span>Início da Temporada Esportiva • CFT-09</span>
            <span>•</span>
            <span className="text-sky-500 dark:text-sky-400 font-extrabold tracking-wider uppercase">ETECANOS ATÉ MORRER</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
