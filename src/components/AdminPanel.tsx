import React, { useState } from 'react';
import { 
  Lock, KeyRound, UserCheck, Users, TrendingUp, AlertCircle, 
  FileCheck, ShieldAlert, Copy, Check, Trash2, Calendar, DollarSign, 
  Plus, Search, Sparkles, User, Briefcase, FileText, Info, HelpCircle, ChevronRight
} from 'lucide-react';
import { Contract } from '../types';
import { generateContractPDF, generateBidCardPDF } from '../utils/pdfGenerator';

interface AdminPanelProps {
  contracts: Contract[];
  onAddContract: (contract: Omit<Contract, 'id' | 'code' | 'status'>) => void;
  onDeleteContract: (id: string) => void;
}

export default function AdminPanel({ contracts, onAddContract, onDeleteContract }: AdminPanelProps) {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Form State
  const [playerName, setPlayerName] = useState('');
  const [position, setPosition] = useState('Meio-Campo');
  const [salary, setSalary] = useState('');
  const [durationMonths, setDurationMonths] = useState(12);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [shirtNumber, setShirtNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // UI state
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  
  // Custom delete confirmation state (safe for iframes - replaces window.confirm)
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Standard login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === 'admin' && password === 'admin123') {
      setIsLoggedIn(true);
      setError('');
    } else {
      setError('Credenciais inválidas. Verifique o usuário e a senha.');
    }
  };

  // Football Positions list
  const fieldPositions = [
    'Goleiro', 'Zagueiro', 'Lateral Esquerdo', 'Lateral Direito',
    'Volante', 'Meio-Campo', 'Ponta-Esquerda', 'Ponta-Direita', 'Centroavante'
  ];

  // Submit contract invite handler
  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      alert('Por favor, informe o nome do jogador.');
      return;
    }
    const salaryNum = parseFloat(salary);
    if (isNaN(salaryNum) || salaryNum <= 0) {
      alert('Por favor, defina um salário mensal válido.');
      return;
    }

    onAddContract({
      playerName: playerName.trim(),
      position,
      salary: salaryNum,
      durationMonths: Number(durationMonths),
      startDate,
      shirtNumber: shirtNumber ? Number(shirtNumber) : undefined,
      notes: notes.trim() || undefined
    });

    // Reset Form
    setPlayerName('');
    setPosition('Meio-Campo');
    setSalary('');
    setDurationMonths(12);
    setStartDate(new Date().toISOString().split('T')[0]);
    setShirtNumber('');
    setNotes('');
    
    setFormSuccess('Sucesso! O pré-contrato foi gerado com chave única de acesso.');
    setTimeout(() => setFormSuccess(''), 5000);
  };

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const executeDelete = (id: string) => {
    onDeleteContract(id);
    setDeletingId(null);
    if (selectedContract?.id === id) {
      setSelectedContract(null);
    }
  };

  // Metrics Calculations
  const totalContracts = contracts.length;
  const signedContracts = contracts.filter(c => c.status === 'SIGNED').length;
  const pendingContracts = contracts.filter(c => c.status === 'PENDING').length;
  const totalPayroll = contracts.reduce((sum, c) => sum + (c.status === 'SIGNED' ? c.salary : 0), 0);

  // Filter roster list
  const filteredContracts = contracts.filter(c => 
    c.playerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div id="admin-login-card" className="bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden transition-all duration-350 hover:shadow-sky-100/60">
          
          {/* Elegant header banner using sky blue + slate styling */}
          <div className="bg-gradient-to-b from-sky-500 to-sky-700 p-8 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-10 -mb-10 pointer-events-none" />

            <div className="inline-flex p-3 bg-white/10 backdrop-blur-md rounded-2xl mb-4 border border-white/20">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-black tracking-tight tracking-wider">PORTAL DA DIRETORIA</h2>
            <p className="text-xs text-sky-100 mt-1 max-w-xs mx-auto">
              Controle de convocação, salários, vigências e assinaturas de atletas do ETECANOS FC.
            </p>
          </div>

          <div className="p-8 space-y-6">
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-700 animate-fadeIn">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" />
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Usuário Administrador</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
                  <input
                    id="admin-username-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ex: admin"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Senha Diretora de Elenco</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
                  <input
                    id="admin-password-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha secreta de acesso"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-mono"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                id="admin-submit-login-btn"
                type="submit"
                className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-md transition-all active:scale-98 select-none tracking-wide cursor-pointer flex items-center justify-center gap-2 hover:shadow-sky-500/20"
              >
                <span>Acessar Painel Admin</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 text-center">
              <span className="text-[11px] text-slate-400 leading-relaxed block">
                Acesso de demonstração padrão do clube:<br /> 
                <strong className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs">admin</strong> com a senha <strong className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs">admin123</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Visual top greeting with nice light blue glow */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-sky-50 through-white to-sky-50/20 p-6 rounded-3xl border border-sky-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs uppercase font-extrabold text-sky-800 tracking-wider">Diretoria Eteen-FC Conectada</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Painel de Licenciamento Desportivo</h2>
          <p className="text-xs text-slate-500">Crie propostas personalizadas e envie as chaves de convite única para cada jogador assinar.</p>
        </div>

        <button
          id="admin-logout-btn"
          type="button"
          onClick={() => setIsLoggedIn(false)}
          className="text-xs text-rose-600 hover:text-white hover:bg-rose-600 font-bold bg-white px-4 py-2 rounded-xl border border-rose-200 transition-all select-none self-start md:self-center cursor-pointer"
        >
          Desconectar Sessão
        </button>
      </div>

      {/* Overview Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs transition-all hover:border-sky-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Elenco Cadastrado</span>
            <div className="bg-slate-50 p-2 rounded-xl text-slate-500 border border-slate-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-3xl font-black text-slate-800 font-mono tracking-tight">{totalContracts}</span>
            <p className="text-[11px] text-slate-400">Total de propostas de contratos</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs transition-all hover:border-emerald-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Firmados (BID)</span>
            <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 border border-emerald-100">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-3xl font-black text-emerald-600 font-mono tracking-tight">{signedContracts}</span>
            <p className="text-[11px] text-emerald-500">Atletas que já assinaram</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs transition-all hover:border-amber-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Envios Pendentes</span>
            <div className="bg-amber-50/50 p-2 rounded-xl text-amber-600 border border-amber-100">
              <AlertCircle className="w-5 h-5 text-amber-550" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-3xl font-black text-amber-500 font-mono tracking-tight">{pendingContracts}</span>
            <p className="text-[11px] text-amber-500">Aguardando assinatura</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs transition-all hover:border-indigo-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Folha Líquida Ativa</span>
            <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600 border border-indigo-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl font-black text-indigo-700 font-mono tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalPayroll)}
            </span>
            <p className="text-[11px] text-indigo-500">Mensal dos contratos ativos</p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Creation Form Block: visual card */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <div className="p-2 bg-sky-50 rounded-xl">
              <Sparkles className="w-5 h-5 text-sky-650" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">Novo Vínculo Esportivo</h3>
              <p className="text-[11px] text-slate-400">Preencha os termos financeiros do jogador</p>
            </div>
          </div>

          {formSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-800 flex items-start gap-2.5 animate-fadeIn">
              <Check className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleCreateContract} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Nome Oficial do Atleta</label>
              <input
                id="form-player-name"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ex: Gabriel Barbosa Silva"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-slate-800 placeholder-slate-400"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Camisa Sugerida</label>
                <input
                  id="form-shirt-number"
                  type="number"
                  value={shirtNumber}
                  onChange={(e) => setShirtNumber(e.target.value)}
                  placeholder="Ex: 9"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Posição Principal</label>
                <select
                  id="form-position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-2.5 text-sm font-bold focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-slate-700 cursor-pointer"
                >
                  {fieldPositions.map((pos) => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Salário Mensal (R$)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-bold">R$</span>
                  <input
                    id="form-salary"
                    type="number"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="Ex: 8500"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3.5 text-sm font-bold focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-mono text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Vigência (Meses)</label>
                <select
                  id="form-duration"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-2.5 text-sm font-bold focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-slate-700 cursor-pointer"
                >
                  <option value={3}>3 Meses (Experiência)</option>
                  <option value={6}>6 Meses (Curto)</option>
                  <option value={12}>12 Meses (1 Ano)</option>
                  <option value={24}>24 Meses (2 Anos)</option>
                  <option value={36}>36 Meses (3 Anos)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Início da Atividade no Clube</label>
              <div className="relative">
                <Calendar className="absolute right-3.5 top-3 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                <input
                  id="form-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Premiações ou Observações</label>
              <textarea
                id="form-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Auxílio moradia, bônus por partida ganha de R$ 300, etc."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all placeholder-slate-400"
              />
            </div>

            <button
              id="submit-register-contract-btn"
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white font-extrabold text-sm py-3 px-4 rounded-xl select-none transition-all shadow-md hover:shadow-sky-500/10 active:scale-98 cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Gerar Convite & Chave Única</span>
            </button>
          </form>
        </div>

        {/* Existing Contracts List Grid: visual card */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm flex flex-col min-h-[500px] space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">Banco de Contratos e Atletas</h3>
              <p className="text-[11px] text-slate-400">Monitore, apague ou copie os códigos de assinatura</p>
            </div>
            
            {/* Search Input Custom Icon Styling */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="contracts-search-input"
                type="text"
                placeholder="Buscar jogador, cargo ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
              />
            </div>
          </div>

          {filteredContracts.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl flex-grow flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400">
                <Briefcase className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700">Nenhum contrato localizado</p>
                <p className="text-xs max-w-xs mx-auto">Tente alterar os termos do filtro ou adicione um novo atleta no painel esquerdo.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-[580px] flex-grow pr-1">
              {filteredContracts.map((contract) => (
                <div 
                  key={contract.id} 
                  id={`contract-item-${contract.id}`}
                  className={`border rounded-2xl p-5 transition-all duration-200 ${
                    selectedContract?.id === contract.id 
                    ? 'border-sky-450 ring-4 ring-sky-500/5 bg-sky-50/5 shadow-xs' 
                    : 'border-slate-150 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800 text-sm md:text-base tracking-tight">{contract.playerName}</span>
                        {contract.shirtNumber && (
                          <span className="bg-sky-100 text-sky-850 text-[10px] font-black px-2 py-0.5 rounded-md border border-sky-200">
                            CAMISA {contract.shirtNumber}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 font-medium">
                        <span className="bg-slate-100 font-extrabold text-slate-600 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wide">{contract.position}</span>
                        <span>•</span>
                        <span className="font-bold text-slate-800 font-mono">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.salary)}/mês
                        </span>
                        <span>•</span>
                        <span className="bg-sky-50/60 text-sky-700 font-bold px-1.5 py-0.3 rounded text-[10px]">{contract.durationMonths} Meses</span>
                      </div>
                    </div>

                    {/* Status Badge & Safe Delete Action */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        contract.status === 'SIGNED' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${contract.status === 'SIGNED' ? 'bg-emerald-555 bg-emerald-600' : 'bg-amber-500'}`} />
                        {contract.status === 'SIGNED' ? 'Registrado BID' : 'Pendente'}
                      </span>

                      {/* Clean Iframe-friendly custom confirm state trigger */}
                      {deletingId !== contract.id ? (
                        <button
                          id={`delete-contract-btn-${contract.id}`}
                          type="button"
                          onClick={() => setDeletingId(contract.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Apagar contrato"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 bg-rose-550 bg-rose-600 text-white rounded-xl p-1 text-[10px] font-bold animate-fadeIn">
                          <span className="px-2">Excluir?</span>
                          <button
                            id={`confirm-delete-${contract.id}`}
                            type="button"
                            onClick={() => executeDelete(contract.id)}
                            className="bg-white text-rose-700 px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors uppercase font-black"
                          >
                            Sim
                          </button>
                          <button
                            id={`cancel-delete-${contract.id}`}
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="text-white hover:text-slate-100 px-2 py-0.5 font-bold transition-colors uppercase"
                          >
                            Não
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Share code invitation action banner */}
                  <div className="mt-4 bg-slate-50 border border-slate-200/60 p-3 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-indigo-50 text-indigo-700 rounded-md">
                        <KeyRound className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Chave de Convocação do Jogador:</span>
                      <strong className="font-mono text-indigo-800 text-sm bg-indigo-50 border border-indigo-150 py-0.5 px-2.5 rounded-md">
                        {contract.code}
                      </strong>
                    </div>

                    <button
                      id={`copy-code-btn-${contract.id}`}
                      type="button"
                      onClick={() => handleCopyCode(contract.code, contract.id)}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-extrabold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors select-none active:scale-95 cursor-pointer w-full sm:w-auto"
                    >
                      {copiedCodeId === contract.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                          <span className="text-emerald-700 font-bold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Chave</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Open details / download contract action drawer links */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      id={`toggle-details-btn-${contract.id}`}
                      type="button"
                      onClick={() => setSelectedContract(selectedContract?.id === contract.id ? null : contract)}
                      className="text-xs text-sky-600 hover:text-sky-850 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-sky-500" />
                      {selectedContract?.id === contract.id ? 'Ocultar Detalhes' : 'Visualizar Detalhes'}
                    </button>

                    {contract.status === 'SIGNED' ? (
                      <div className="flex gap-2">
                        <button
                          id={`download-signed-pdf-btn-${contract.id}`}
                          type="button"
                          onClick={() => generateContractPDF(contract)}
                          className="flex items-center gap-1 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-black px-3.5 py-2 rounded-xl border border-sky-150 cursor-pointer transition-colors"
                          title="Baixar Contrato Oficial"
                        >
                          <FileCheck className="w-4 h-4 text-sky-600" />
                          <span>Contrato</span>
                        </button>
                        <button
                          id={`download-signed-card-btn-${contract.id}`}
                          type="button"
                          onClick={() => generateBidCardPDF(contract)}
                          className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black px-3.5 py-2 rounded-xl border border-emerald-150 cursor-pointer transition-colors"
                          title="Baixar Carteirinha do BID"
                        >
                          <FileCheck className="w-4 h-4 text-emerald-600" />
                          <span>Carteira BID</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Preencha ou assine na página Jogador para liberar PDF</span>
                    )}
                  </div>

                  {/* Expanded Detail Draw container containing nice football metrics */}
                  {selectedContract?.id === contract.id && (
                    <div className="mt-4 p-4 border border-slate-200 bg-slate-50/50 rounded-2xl space-y-4 animate-fadeIn text-xs">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-600">
                        <div className="bg-white p-3 rounded-xl border border-slate-150">
                          <span className="font-bold block text-[9px] text-slate-400 uppercase tracking-widest mb-1">Início da Proposta:</span>
                          <span className="text-slate-800 font-extrabold text-xs">
                            {new Date(contract.startDate).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-150">
                          <span className="font-bold block text-[9px] text-slate-400 uppercase tracking-widest mb-1">Duração de Contrato:</span>
                          <span className="text-slate-800 font-extrabold text-xs">
                            {contract.durationMonths} meses ({Number(contract.durationMonths)/12 >= 1 ? `${Number(contract.durationMonths)/12} Ano(s)` : 'Curta Duração'})
                          </span>
                        </div>
                        {contract.birthDate && (
                          <div className="bg-white p-3 rounded-xl border border-slate-150">
                            <span className="font-bold block text-[9px] text-slate-400 uppercase tracking-widest mb-1">Data de Nascimento:</span>
                            <span className="text-slate-800 font-extrabold text-xs">
                              {new Date(contract.birthDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                            </span>
                          </div>
                        )}
                        {contract.bidNumber && (
                          <div className="bg-white p-3 rounded-xl border border-slate-150">
                            <span className="font-bold block text-[9px] text-slate-400 uppercase tracking-widest mb-1">Inscrição B.I.D. Oficial:</span>
                            <span className="text-indigo-800 font-extrabold text-xs font-mono">
                              {contract.bidNumber} ({contract.bidProtocol})
                            </span>
                          </div>
                        )}
                      </div>

                      {contract.photoDataUrl && (
                        <div className="bg-white p-3 rounded-xl border border-slate-150 flex items-center gap-3 text-slate-600">
                          <img 
                            src={contract.photoDataUrl} 
                            alt="Foto Atleta" 
                            className="w-10 h-13 object-cover rounded border border-slate-200"
                          />
                          <div>
                            <span className="font-bold block text-[9px] text-slate-400 uppercase tracking-widest mb-0.5">Identidade de Perfil Registrada:</span>
                            <span className="text-slate-705 text-xs font-medium">Foto chancelada para carteirinha de atleta</span>
                          </div>
                        </div>
                      )}

                      {contract.notes && (
                        <div className="bg-white p-3 rounded-xl border border-slate-150 space-y-1">
                          <span className="font-bold block text-[9px] text-slate-400 uppercase tracking-widest">Observações & Cláusulas:</span>
                          <p className="text-slate-700 leading-relaxed italic text-xs">
                            "{contract.notes}"
                          </p>
                        </div>
                      )}

                      {contract.status === 'SIGNED' && contract.signatureDataUrl && (
                        <div className="pt-3 border-t border-slate-200">
                          <span className="font-bold block text-[9px] text-slate-400 uppercase tracking-widest mb-2">Assinatura Auditoria Digital:</span>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-150">
                            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg shrink-0 flex items-center justify-center max-w-[200px]">
                              <img 
                                src={contract.signatureDataUrl} 
                                alt="Assinatura" 
                                className="h-12 w-32 object-contain"
                              />
                            </div>
                            <div className="space-y-1">
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Timestamp do Vínculo:</span>
                                <span className="font-mono text-slate-700 font-bold text-xs">
                                  {new Date(contract.signedAt || '').toLocaleString('pt-BR')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold">
                                <FileCheck className="w-3.5 h-3.5" />
                                <span>Verificado Via Chave Token Org</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
