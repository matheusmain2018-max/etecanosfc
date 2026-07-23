import React, { useState } from 'react';
import { 
  KeyRound, FileText, CheckCircle2, FileSignature, ChevronRight, 
  Sparkles, ShieldCheck, Mail, ArrowRight, CornerDownRight, Award, 
  HelpCircle, Calendar, RefreshCcw, Download, Info, Upload
} from 'lucide-react';
import { Contract } from '../types';
import SignatureCanvas from './SignatureCanvas';
import { generateContractPDF, generateBidCardPDF, formatCurrency, formatDateBr } from '../utils/pdfGenerator';

interface PlayerViewProps {
  contracts: Contract[];
  onSignContract: (
    id: string, 
    signatureDataUrl: string, 
    extraData?: { birthDate?: string; photoDataUrl?: string; bidNumber?: string; bidProtocol?: string }
  ) => Promise<void>;
  initialCode?: string;
}

// Utility function to compress images using Canvas (making high-res mobile photos super lightweight for Firestore)
const compressImage = (base64Str: string, maxWidth = 250, maxHeight = 300, quality = 0.75): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate scale
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = () => {
      resolve(base64Str);
    };

    img.src = base64Str;
  });
};

export default function PlayerView({ contracts, onSignContract, initialCode }: PlayerViewProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [activeContract, setActiveContract] = useState<Contract | null>(null);
  
  // Extra fields for BID Card
  const [birthDate, setBirthDate] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState('');

  // Auto-load code if set by the home view
  React.useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      setError('');
      const match = contracts.find(
        (c) => c.code.trim().toUpperCase() === initialCode.trim().toUpperCase()
      );
      if (match) {
        setActiveContract(match);
        setBirthDate(match.birthDate || '');
        setPhotoDataUrl(match.photoDataUrl || '');
        if (match.signatureDataUrl) {
          setSignatureData(match.signatureDataUrl);
        } else {
          setSignatureData('');
        }
      }
    }
  }, [initialCode, contracts]);

  // Temporary signature holder
  const [signatureData, setSignatureData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState(false);

  // Search for the contract based on the unique code
  const handleSearchContract = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!code.trim()) {
      setError('Por favor, informe a chave de convocação.');
      return;
    }

    // Match code case-insensitively
    const match = contracts.find(
      (c) => c.code.trim().toUpperCase() === code.trim().toUpperCase()
    );

    if (match) {
      setActiveContract(match);
      setBirthDate(match.birthDate || '');
      setPhotoDataUrl(match.photoDataUrl || '');
      if (match.signatureDataUrl) {
        setSignatureData(match.signatureDataUrl);
      } else {
        setSignatureData('');
      }
    } else {
      setError('Código ou senha não cadastrados. Verifique se digitou as letras e números corretamente ou solicite uma nova via com a comissão técnica do Etecanos.');
    }
  };

  const handleSignatureSave = (dataUrl: string) => {
    setSignatureData(dataUrl);
  };

  const handleFinalizeSignature = async () => {
    if (!activeContract) return;
    if (!signatureData) {
      alert('Por favor, trace a sua assinatura antes de confirmar.');
      return;
    }
    if (!birthDate) {
      alert('Por favor, preencha a sua data de nascimento.');
      return;
    }

    setIsSubmitting(true);

    const bidNumber = activeContract.bidNumber || Math.floor(100000 + Math.random() * 900000).toString();
    const bidProtocol = activeContract.bidProtocol || `${Math.floor(1000000 + Math.random() * 9000000)}SP`;

    const extraFields = {
      birthDate,
      photoDataUrl: photoDataUrl || '',
      bidNumber,
      bidProtocol
    };

    try {
      // Complete database update and wait for the request to succeed on Firestore
      await onSignContract(activeContract.id, signatureData, extraFields);
      
      const updatedContract = {
        ...activeContract,
        status: 'SIGNED' as const,
        signatureDataUrl: signatureData,
        signedAt: new Date().toISOString(),
        ...extraFields
      };
      
      setActiveContract(updatedContract);
      setSuccessAnimation(true);
      
      // Auto-trigger PDF downloads for immediate feedback
      try {
        generateContractPDF(updatedContract);
        generateBidCardPDF(updatedContract);
      } catch (e) {
        console.error('Falha ao descarregar PDFs:', e);
      }
    } catch (e: any) {
      console.error('Falha ao registrar assinatura:', e);
      let erroText = 'Ocorreu um erro de gravação ao salvar a assinatura no banco do clube.';
      if (e instanceof Error) {
        if (e.message.includes('exceeds maximum limit') || e.message.includes('too large')) {
          erroText += ' O tamanho do arquivo ou foto excede o limite. Por favor, tente enviar outra foto menor.';
        } else {
          erroText += ` Detalhes do erro: ${e.message}`;
        }
      }
      alert(erroText);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset to seek other player
  const handleResetSearch = () => {
    setActiveContract(null);
    setCode('');
    setSignatureData('');
    setBirthDate('');
    setPhotoDataUrl('');
    setSuccessAnimation(false);
    setError('');
  };

  const recruitmentTermsList = [
    { label: 'Exclusividade federativa plena com a agremiação BILAU LOMBRADO FC.', icon: ShieldCheck },
    { label: 'Treinar rigorosamente e honrar as cores oficiais em campo.', icon: Award },
    { label: 'Preservar conduta exemplar em campeonatos oficiais ou amistosos.', icon: Sparkles },
  ];

  // If no contract is loaded, render the gate validator screen
  if (!activeContract) {
    return (
      <div className="max-w-xl mx-auto py-10 px-4">
        <div id="player-gate-wrapper" className="bg-white dark:bg-[#140609] border border-slate-150 dark:border-red-950/60 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-amber-500/10">
          
          {/* Header Theme representation */}
          <div className="bg-gradient-to-b from-red-800 via-red-900 to-black py-10 px-6 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full -mr-10 -mt-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-28 h-28 bg-amber-500/10 rounded-full -ml-10 -mb-10 pointer-events-none" />

            <div className="inline-flex p-3 bg-white/10 backdrop-blur-md rounded-2xl mb-4 border border-amber-400/30">
              <FileSignature className="w-6 h-6 text-amber-300" />
            </div>

            <h2 className="text-2xl font-black tracking-tight tracking-wider text-amber-200">ASSINATURA DE CONTRATO</h2>
            <p className="text-xs text-amber-100/90 mt-2 max-w-sm mx-auto leading-relaxed">
              Bem-vindo ao sistema de assinatura do <strong>BILAU LOMBRADO FC</strong>. Insira a sua chave exclusiva gerada pela diretoria para acessar seu contrato de futebol.
            </p>
          </div>

          <div className="p-8 space-y-6">
            <form onSubmit={handleSearchContract} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-stone-400 uppercase tracking-widest block">Chave / Chave de Convocação</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 w-5 h-5 text-slate-400 dark:text-stone-500" />
                  <input
                    id="player-search-code-input"
                    type="text"
                    placeholder="Ex: BL-1010"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#070103] border border-slate-200 dark:border-red-950/60 rounded-xl py-3 pl-11 pr-4 text-base font-bold focus:bg-white dark:focus:bg-[#0e0305] focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-mono uppercase tracking-widest text-slate-800 dark:text-stone-100 placeholder-slate-400 dark:placeholder-stone-600"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 rounded-2xl text-xs text-rose-700 dark:text-rose-300 leading-relaxed font-semibold animate-fadeIn">
                  {error}
                </div>
              )}

              <button
                id="search-contract-btn"
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 text-amber-300 font-extrabold py-3 px-4 rounded-xl shadow-md transition-all active:scale-98 select-none tracking-wide cursor-pointer border border-amber-500/30"
              >
                <span>Acessar Termos Contratuais</span>
                <ChevronRight className="w-5 h-5 text-amber-300" />
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-red-950/60 space-y-3">
              <span className="text-[11px] font-extrabold text-slate-400 dark:text-stone-400 block uppercase tracking-wider text-center">Processo Simplificado de Contratação</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-500 dark:text-stone-400">
                <div className="bg-slate-50/50 dark:bg-[#070103] p-3 rounded-xl border border-slate-100 dark:border-red-950/60 text-center space-y-1">
                  <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold flex items-center justify-center mx-auto text-[11px]">1</span>
                  <p className="font-semibold text-slate-700 dark:text-stone-200">Convocação</p>
                  <p className="text-[10px] leading-snug text-slate-500 dark:text-stone-400">Solicite sua chave (ex: BL-1010) com a diretoria.</p>
                </div>
                <div className="bg-slate-50/50 dark:bg-[#070103] p-3 rounded-xl border border-slate-100 dark:border-red-950/60 text-center space-y-1">
                  <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold flex items-center justify-center mx-auto text-[11px]">2</span>
                  <p className="font-semibold text-slate-700 dark:text-stone-200">Revisão</p>
                  <p className="text-[10px] leading-snug text-slate-500 dark:text-stone-400">Verifique o salário acordado e benefícios adicionais.</p>
                </div>
                <div className="bg-slate-50/50 dark:bg-[#070103] p-3 rounded-xl border border-slate-100 dark:border-red-950/60 text-center space-y-1">
                  <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold flex items-center justify-center mx-auto text-[11px]">3</span>
                  <p className="font-semibold text-slate-700 dark:text-stone-200">Assinatura</p>
                  <p className="text-[10px] leading-snug text-slate-500 dark:text-stone-400">Escreva seu nome com o mouse/tela e emita o PDF.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-2 px-4 space-y-6 animate-fadeIn">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          id="back-to-contract-search"
          type="button"
          onClick={handleResetSearch}
          className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-extrabold transition-colors bg-white dark:bg-[#140609] hover:bg-slate-50 dark:hover:bg-[#1f090d] py-2 px-4 rounded-xl border border-slate-200 dark:border-red-950/60 shadow-sm cursor-pointer self-start"
        >
          <RefreshCcw className="w-4 h-4" />
          <span>Consultar Outro Registro</span>
        </button>

        <span className="text-xs text-slate-400 dark:text-stone-400 font-medium">
          Identificador da Transferência: <strong className="font-mono text-slate-600 dark:text-amber-300 bg-slate-100 dark:bg-red-950/60 px-2 py-0.5 rounded">{activeContract.code}</strong>
        </span>
      </div>

      {successAnimation && (
        <div id="contract-success-banner" className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-150 dark:border-emerald-900/50 text-emerald-850 dark:text-emerald-200 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-4 animate-scaleUp">
          <div className="p-3 bg-emerald-100/80 dark:bg-emerald-900/60 rounded-2xl text-emerald-700 dark:text-emerald-300 shrink-0 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="text-center md:text-left space-y-1 flex-grow">
            <h3 className="font-black text-lg text-emerald-950 dark:text-emerald-100">CONTRATO ASSINADO E REGISTRADO NO B.I.D.!</h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed max-w-2xl">
              Fidelidade confirmada, <strong>{activeContract.playerName}</strong>! O documento desportivo foi chancelado e a sua carteira do atleta (BID) foi emitida com sucesso. Baixe os documentos de sua preferência abaixo separadamente:
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0">
            <button
              id="success-download-pdf-btn"
              type="button"
              onClick={() => generateContractPDF(activeContract)}
              className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 text-amber-300 border border-amber-500/30 font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer select-none"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Baixar Contrato</span>
            </button>
            <button
              id="success-download-card-btn"
              type="button"
              onClick={() => generateBidCardPDF(activeContract)}
              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer select-none"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Baixar Carteira do BID</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Modern Beautiful Parchment for Reviewing */}
        <div className="lg:col-span-7 bg-white dark:bg-[#140609] border border-slate-200 dark:border-red-950/60 rounded-3xl shadow-md overflow-hidden relative">
          
          {/* Aesthetic team flag representation header */}
          <div className="h-2 bg-gradient-to-r from-amber-400 via-red-800 to-amber-500" />

          <div className="p-6 md:p-8 space-y-6">
            
            <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-100 dark:border-red-950/60 pb-5 gap-3">
              <div className="text-center sm:text-left">
                <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider block font-mono">Agência de Classificação Esportiva</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">CONTRATO DE PRESTAÇÃO DE TRABALHO DESPORTIVO</h3>
              </div>
              <div className="bg-amber-500/10 text-amber-800 dark:text-amber-300 font-mono text-[9px] font-extrabold uppercase py-1 px-3 rounded-full border border-amber-500/20">
                Chancela Geral CBF
              </div>
            </div>

            {/* Contract specifications grid */}
            <div className="bg-slate-50/70 dark:bg-[#070103] border border-slate-200 dark:border-red-950/60 rounded-2xl p-5 space-y-4">
              <span className="text-[10px] font-bold text-slate-400 dark:text-stone-400 block uppercase tracking-wider">I. CLÁUSULA GERAL DE CADASTRO</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                
                <div className="bg-white dark:bg-[#140609] p-3.5 rounded-xl border border-slate-150/80 dark:border-red-950/40">
                  <span className="text-slate-400 dark:text-stone-400 block text-[9px] font-bold uppercase tracking-wide mb-0.5">Nome de Inscrição:</span>
                  <span className="text-slate-800 dark:text-stone-100 text-sm font-black">{activeContract.playerName}</span>
                </div>

                <div className="bg-white dark:bg-[#140609] p-3.5 rounded-xl border border-slate-150/80 dark:border-red-950/40">
                  <span className="text-slate-400 dark:text-stone-400 block text-[9px] font-bold uppercase tracking-wide mb-0.5">Posição Contratada:</span>
                  <span className="text-amber-800 dark:text-amber-300 text-xs font-extrabold bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 px-2 py-0.5 rounded-md inline-block mt-0.5">
                    {activeContract.position}
                  </span>
                </div>

                <div className="bg-white dark:bg-[#140609] p-3.5 rounded-xl border border-slate-150/80 dark:border-red-950/40">
                  <span className="text-slate-400 dark:text-stone-400 block text-[9px] font-bold uppercase tracking-wide mb-0.5">Subsídio Mensal Base:</span>
                  <span className="text-slate-800 dark:text-stone-100 font-mono text-sm font-black mt-0.5 block">
                    {formatCurrency(activeContract.salary)} <span className="text-[9px] font-medium text-slate-500 dark:text-stone-400">(BRL/Mês)</span>
                  </span>
                </div>

                <div className="bg-white dark:bg-[#140609] p-3.5 rounded-xl border border-slate-150/80 dark:border-red-950/40">
                  <span className="text-slate-400 dark:text-stone-400 block text-[9px] font-bold uppercase tracking-wide mb-0.5">Vigência Ativa do Vínculo:</span>
                  <span className="text-slate-800 dark:text-stone-100 text-xs font-extrabold mt-0.5 block">
                    {activeContract.durationMonths} Meses de Cooperação
                  </span>
                </div>

                <div className="bg-white dark:bg-[#140609] p-3.5 rounded-xl border border-slate-150/80 dark:border-red-950/40">
                  <span className="text-slate-400 dark:text-stone-400 block text-[9px] font-bold uppercase tracking-wide mb-0.5">Data de Estreia Legal:</span>
                  <span className="text-slate-800 dark:text-stone-100 font-bold block mt-0.5">
                    {formatDateBr(activeContract.startDate)}
                  </span>
                </div>

                <div className="bg-white dark:bg-[#140609] p-3.5 rounded-xl border border-slate-150/80 dark:border-red-950/40">
                  <span className="text-slate-400 dark:text-stone-400 block text-[9px] font-bold uppercase tracking-wide mb-0.5">Numeração da Camisa:</span>
                  <span className="text-red-900 dark:text-red-400 font-black block mt-0.5">
                    {activeContract.shirtNumber ? `Número ${activeContract.shirtNumber}` : 'Camisa em Definição'}
                  </span>
                </div>

                {(birthDate || activeContract.birthDate) && (
                  <div className="bg-white dark:bg-[#140609] p-3.5 rounded-xl border border-slate-150/80 dark:border-red-950/40">
                    <span className="text-slate-400 dark:text-stone-400 block text-[9px] font-bold uppercase tracking-wide mb-0.5">Data de Nascimento:</span>
                    <span className="text-slate-800 dark:text-stone-100 font-bold block mt-0.5">
                      {formatDateBr(birthDate || activeContract.birthDate || '')}
                    </span>
                  </div>
                )}

                {(photoDataUrl || activeContract.photoDataUrl) && (
                  <div className="bg-white dark:bg-[#140609] p-3.5 rounded-xl border border-slate-150/80 dark:border-red-950/40 flex items-center gap-3 col-span-1 sm:col-span-2">
                    <img 
                      src={photoDataUrl || activeContract.photoDataUrl} 
                      alt="Avatar do Atleta" 
                      className="w-10 h-12 object-cover rounded border border-slate-200 dark:border-red-950/60"
                    />
                    <div>
                      <span className="text-slate-400 dark:text-stone-400 block text-[9px] font-bold uppercase tracking-wide">Foto Cadastrada:</span>
                      <span className="text-emerald-700 dark:text-emerald-400 text-xs font-semibold block">Imagem ativa para emissão do BID</span>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Document Content text mock representation */}
            <div id="contract-legal-clauses" className="text-xs text-slate-600 dark:text-stone-300 leading-relaxed font-sans space-y-4">
              <p>
                <strong>CLÁUSULA SEGUNDA - DA REMUNERAÇÃO:</strong> Pelos serviços acordados de prática do futebol de alto rendimento, o clube repassará até o 5º dia útil de cada mês vencido o valor mensal fixado de <strong>{formatCurrency(activeContract.salary)}</strong>.
              </p>
              <p>
                <strong>CLÁUSULA TERCEIRA - DO COMPROMISSO COM AS DIRETRIZES DO CLUBE:</strong> O atleta obriga-se a defender o clube unindo raça, compromisso técnico e ética esportiva, cumprindo a risca as obrigações desportivas e honrando de forma unívoca as cores oficiais vinho, azul marinho e dourado.
              </p>

              {activeContract.notes && (
                <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-500/20 p-4 rounded-xl text-slate-700 dark:text-stone-300 text-xs mt-4">
                  <strong className="text-amber-800 dark:text-amber-300 block text-[10px] uppercase font-bold tracking-wider mb-1">Cláusulas e Observações Acordadas Especialmente:</strong>
                  <p className="italic text-slate-600 dark:text-stone-300 leading-relaxed">"{activeContract.notes}"</p>
                </div>
              )}
            </div>

            {/* Interactive visual signatures line */}
            {activeContract.status === 'SIGNED' && activeContract.signatureDataUrl && (
              <div className="border-t border-slate-100 dark:border-red-950/60 pt-6">
                <div className="grid grid-cols-2 gap-6 text-center">
                  
                  <div className="space-y-1">
                    <div className="h-12 flex items-end justify-center pb-2 text-amber-700 dark:text-amber-400 font-extrabold text-xs italic font-mono select-none">
                      💼 Diretoria BILAU LOMBRADO FC
                    </div>
                    <span className="w-11/12 h-px bg-slate-200 dark:bg-red-950/60 block mx-auto" />
                    <span className="text-[9px] font-bold text-slate-400 dark:text-stone-400 block uppercase tracking-wider">DIRETORIA DO CLUBE</span>
                  </div>

                  <div className="space-y-1">
                    <div className="h-12 flex items-center justify-center bg-slate-50 dark:bg-[#070103] border border-dashed border-slate-200 dark:border-red-950/60 rounded-xl overflow-hidden p-1.5 max-h-12">
                      <img 
                        src={activeContract.signatureDataUrl} 
                        alt="Signature written by athlete" 
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <span className="w-11/12 h-px bg-slate-200 dark:bg-red-950/60 block mx-auto" />
                    <span className="text-[9px] font-bold text-slate-400 dark:text-stone-400 block uppercase tracking-wider">ASSINATURA DO JOGADOR</span>
                  </div>

                </div>
              </div>
            )}
            
          </div>
        </div>

        {/* Right Side: Electronic Signature Pad Section OR Download options */}
        <div className="lg:col-span-5 space-y-6">
          
          {activeContract.status === 'PENDING' ? (
            <div id="active-signing-card" className="bg-white dark:bg-[#140609] border border-slate-200 dark:border-red-950/60 rounded-3xl p-6 shadow-md space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-red-950/60">
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-700 dark:text-amber-400">
                  <FileSignature className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-stone-100 text-base">Autenticação Caneta Digital</h3>
                  <p className="text-[11px] text-slate-400 dark:text-stone-400">Assine abaixo para selar seu vínculo</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-stone-300 leading-relaxed">
                Olá, <strong className="text-slate-800 dark:text-stone-100">{activeContract.playerName}</strong>. Por favor, preencha os seus dados obrigatórios e utilize a caneta eletrônica no painel para assinar.
              </p>

              {/* Extra Athlete Details Form for BID Card */}
              <div className="space-y-4 border-t border-slate-100 dark:border-red-950/60 pt-4">
                <h4 className="font-bold text-xs text-slate-800 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Dados Obrigatórios para Cadastro do BID</span>
                </h4>

                {/* 1. Date of Birth input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-stone-400 uppercase tracking-widest block">Data de Nascimento</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 dark:text-stone-500" />
                    <input
                      id="athlete-birthdate-input"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#070103] border border-slate-200 dark:border-red-950/60 rounded-xl py-2 pl-10 pr-4 text-xs font-semibold focus:bg-white dark:focus:bg-[#0e0305] focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-slate-800 dark:text-stone-100"
                      required
                    />
                  </div>
                </div>

                {/* 2. Photo Upload component with base64 reader */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-stone-400 uppercase tracking-widest block">Foto para Carteirinha do BID</label>
                  
                  {photoDataUrl ? (
                    <div className="relative border border-slate-200 dark:border-red-950/60 rounded-xl p-3 bg-slate-50 dark:bg-[#070103] flex items-center gap-3">
                      <img 
                        src={photoDataUrl} 
                        alt="Foto do atleta" 
                        className="w-10 h-12 object-cover rounded border border-slate-300 dark:border-red-950/60 shadow-xs"
                      />
                      <div className="flex-grow min-w-0">
                        <p className="text-[11.5px] font-extrabold text-slate-700 dark:text-stone-200 truncate">Foto carregada com sucesso!</p>
                        <p className="text-[10px] text-slate-500 dark:text-stone-400">Irá constar na sua carteirinha no BID.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPhotoDataUrl('')}
                        className="text-xs text-rose-600 hover:text-rose-800 font-extrabold p-2 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-300 dark:border-red-950/80 bg-slate-50/50 dark:bg-[#070103] rounded-xl p-4 text-center hover:bg-slate-50 dark:hover:bg-[#180509] hover:border-amber-400 transition-colors relative cursor-pointer group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = async (event) => {
                              if (event.target?.result) {
                                const originalBase64 = event.target.result as string;
                                try {
                                  // Instantly auto-compress image on mobile/PC to max 250x300 width/height at 75% quality
                                  // Crucial to prevent document size crossing 1 MiB limit in Firestore database
                                  const compressed = await compressImage(originalBase64, 250, 300, 0.75);
                                  setPhotoDataUrl(compressed);
                                } catch (err) {
                                  console.error("Erro na compressao do atleta:", err);
                                  setPhotoDataUrl(originalBase64);
                                }
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="space-y-1 select-none pointer-events-none">
                        <Upload className="w-5 h-5 text-slate-400 dark:text-stone-500 group-hover:text-amber-500 mx-auto transition-colors" />
                        <p className="text-[11.5px] font-semibold text-slate-600 dark:text-stone-300">Arraste ou clique para carregar foto</p>
                        <p className="text-[10px] text-slate-400 dark:text-stone-400 font-medium">Formatos PNG/JPG (perfil ou 3x4)</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dotted lines guidance and controls */}
              <div className="space-y-1.5 border-t border-slate-100 dark:border-red-950/60 pt-4">
                <label className="text-[10px] font-bold text-slate-500 dark:text-stone-400 uppercase tracking-widest block mb-1">Assinatura Digital</label>
                <SignatureCanvas 
                  onSave={handleSignatureSave} 
                  playerName={activeContract.playerName} 
                  id="player-signature-canvas"
                />
              </div>

              {/* Complete Contract Action Button */}
              <div className="pt-2">
                <button
                  id="submit-signature-btn"
                  type="button"
                  onClick={handleFinalizeSignature}
                  disabled={!signatureData || !birthDate || isSubmitting}
                  className={`w-full flex items-center justify-center gap-2 font-extrabold text-sm py-3 px-4 rounded-xl shadow-md transition-all select-none cursor-pointer ${
                    !signatureData || !birthDate || isSubmitting
                      ? 'bg-slate-100 dark:bg-stone-900 text-slate-400 dark:text-stone-600 cursor-not-allowed border border-slate-200 dark:border-stone-800 shadow-none'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-emerald-500/15 hover:shadow-lg active:scale-98'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Selandos Termos Contratuais...</span>
                    </>
                  ) : (
                    <>
                      <FileSignature className="w-4 h-4 stroke-[2.5]" />
                      <span>Firmar & Registrar Contrato</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div id="already-signed-info-card" className="bg-white dark:bg-[#140609] border border-slate-200 dark:border-red-950/60 rounded-3xl p-6 shadow-md space-y-5 text-center leading-normal">
              
              {activeContract.photoDataUrl ? (
                <div className="relative w-20 h-26 mx-auto shadow-md rounded-xl overflow-hidden border border-slate-200 dark:border-red-950/60">
                  <img 
                    src={activeContract.photoDataUrl} 
                    alt="Foto do Atleta" 
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto border border-emerald-100 dark:border-emerald-900/50">
                  <ShieldCheck className="w-8 h-8 stroke-[2.5]" />
                </div>
              )}

              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-800 dark:text-stone-100 text-base uppercase">Vínculo Ativo</h3>
                <p className="text-[11px] text-slate-500 dark:text-stone-400 font-medium">
                  Seu registro regular do Boletim Informativo Diário (B.I.D.) está publicado:
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-[#070103] p-4 rounded-2xl border border-slate-200/60 dark:border-red-950/60 text-xs text-slate-600 dark:text-stone-300 space-y-1.5 text-left font-sans font-medium">
                <div className="flex justify-between items-center">
                  <span>Inscrição BID:</span>
                  <span className="font-extrabold text-slate-800 dark:text-stone-100">{activeContract.bidNumber || '167958'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>SITUAÇÃO OFICIAL:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 px-2 py-0.5 rounded-md text-[10px]">PUBLICADO NO B.I.D.</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>ASSINADO EM:</span>
                  <span className="font-semibold text-slate-800 dark:text-stone-200">
                    {activeContract.signedAt ? formatDateBr(activeContract.signedAt) : 'Recentemente'}
                  </span>
                </div>
                {(activeContract.birthDate) && (
                  <div className="flex justify-between items-center">
                    <span>NASCIMENTO:</span>
                    <span className="font-semibold text-slate-800 dark:text-stone-200">{formatDateBr(activeContract.birthDate)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span>CÓD. REGISTRO:</span>
                  <span className="font-mono text-indigo-700 dark:text-amber-300 font-bold bg-indigo-50 dark:bg-red-950/60 px-2 py-0.5 rounded">{activeContract.id.substring(0, 8).toUpperCase()}</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  id="re-download-signed-pdf-btn"
                  type="button"
                  onClick={() => generateContractPDF(activeContract)}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 text-amber-300 border border-amber-500/30 font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer select-none"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Baixar Contrato Especial (PDF)</span>
                </button>

                <button
                  id="download-signed-bid-card-btn"
                  type="button"
                  onClick={() => generateBidCardPDF(activeContract)}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer select-none"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Baixar Carteirinha do BID</span>
                </button>

                <p className="text-[10px] text-slate-400 dark:text-stone-400">
                  Os arquivos PDF podem ser baixados separadamente a qualquer instante.
                </p>
              </div>
            </div>
          )}

          {/* Guidelines info card for club athletes */}
          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-500/20 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-xs text-amber-950 dark:text-amber-300 uppercase block tracking-wider">Diretrizes do Elenco BILAU LOMBRADO FC</h4>
            <ul className="space-y-3 text-xs text-slate-600 dark:text-stone-300 font-medium">
              {recruitmentTermsList.map((term, index) => {
                const Icon = term.icon;
                return (
                  <li key={index} className="flex gap-2.5 items-start">
                    <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>{term.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
