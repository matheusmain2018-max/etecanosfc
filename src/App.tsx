import React, { useState, useEffect } from 'react';
import { 
  FileSignature, Settings, ShieldAlert, Award, ChevronRight, 
  Linkedin, Github, HelpCircle, GraduationCap, Check, HelpCircle as HelpIcon 
} from 'lucide-react';
import { Contract, ActiveTab } from './types';
import TeamLogo from './components/TeamLogo';
import PlayerView from './components/PlayerView';
import AdminPanel from './components/AdminPanel';
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

export default function App() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('player');
  const [isReady, setIsReady] = useState(false);

  // Load contracts from Firestore in real-time
  useEffect(() => {
    const contractsQuery = collection(db, 'contracts');
    
    const unsubscribe = onSnapshot(contractsQuery, async (snapshot) => {
      const loaded: Contract[] = [];
      snapshot.forEach((docSnap) => {
        loaded.push(docSnap.data() as Contract);
      });
      
      if (loaded.length === 0) {
        // If Firestore is empty, initialize it with standard beautiful defaults
        try {
          for (const contract of INITIAL_CONTRACTS) {
            await setDoc(doc(db, 'contracts', contract.id), contract);
          }
        } catch (e) {
          console.error('Falha ao inicializar base do Firestore:', e);
        }
      } else {
        // Sort contracts (newest first based on creation date id index)
        loaded.sort((a, b) => b.id.localeCompare(a.id));
        setContracts(loaded);
        setIsReady(true);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'contracts');
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

    try {
      await setDoc(doc(db, 'contracts', id), newContract);
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
      await updateDoc(doc(db, 'contracts', id), {
        status: 'SIGNED',
        signatureDataUrl,
        signedAt: new Date().toISOString(),
        ...extraData
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `contracts/${id}`);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Aguarde, carregando ETECANOS FC...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col text-slate-800 antialiased font-sans">
      
      {/* Visual top accent line representing primary colors: white + light blue gradient */}
      <div className="h-1.5 bg-gradient-to-r from-sky-400 via-white to-sky-400 w-full" />

      {/* Main Layout Header banner */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between py-3.5 sm:py-4 gap-4">
            
            {/* Club Brand branding Section */}
            <div className="flex items-center gap-3.5 select-none hover:opacity-95 transition-opacity">
              <TeamLogo size="md" />
              <div className="text-center sm:text-left">
                <span className="text-[10px] uppercase font-black text-sky-600 tracking-widest block font-mono">Clube de Futebol</span>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">ETECANOS FC</h1>
                <p className="text-[11px] text-slate-400 font-medium">Assinatura Digital de Elenco Profissional</p>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full sm:w-auto">
              {/* Jogador tab */}
              <button
                id="view-tab-player"
                type="button"
                onClick={() => setActiveTab('player')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4.5 py-2 text-xs md:text-sm font-bold rounded-lg transition-all select-none cursor-pointer ${
                  activeTab === 'player'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <FileSignature className="w-4 h-4" />
                <span>Assinatura do Jogador</span>
              </button>

              {/* Administrador tab */}
              <button
                id="view-tab-admin"
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4.5 py-2 text-xs md:text-sm font-bold rounded-lg transition-all select-none cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Painel da Diretoria</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Body viewports switching based on active tab state */}
      <main className="flex-grow py-6 px-4 md:px-6 max-w-7xl mx-auto w-full">
        {activeTab === 'player' ? (
          <PlayerView 
            contracts={contracts} 
            onSignContract={handleSignContract} 
          />
        ) : (
          <AdminPanel 
            contracts={contracts} 
            onAddContract={handleAddContract}
            onDeleteContract={handleDeleteContract}
          />
        )}
      </main>

      {/* Modern, non-cluttered humble footer credits */}
      <footer className="mt-12 bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-505 bg-sky-200 border border-sky-400 shrink-0" />
            <span>© {new Date().getFullYear()} ETECANOS FC. Todos os direitos reservados.</span>
          </div>
          <div className="flex items-center gap-2.5 justify-center font-medium">
            <span>Início da Temporada Esportiva • CFT-09</span>
            <span>•</span>
            <span className="text-sky-500 font-bold">Azul e Branco com Orgulho</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
