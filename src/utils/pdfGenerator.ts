import { jsPDF } from 'jspdf';
import { Contract } from '../types';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDateBr(dateString: string): string {
  if (!dateString) return '';
  
  // Format YYYY-MM-DD securely without timezone shifts
  if (dateString.includes('-')) {
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
  }

  // Fallback for general strings and safety
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    // Use UTC methods to prevent timezone shifting
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateString;
  }
}

// Asynchronous helper to load image safely with CORS and timeout
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const timer = setTimeout(() => {
      resolve(null);
    }, 4000); // 4 second timeout

    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

// Draw a faded version of an HTMLImageElement using a temporary Canvas
function getFadedImage(img: HTMLImageElement, opacity: number): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width || 400;
    canvas.height = img.naturalHeight || img.height || 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return img.src;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = opacity;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('getFadedImage error:', e);
    return img.src; // fallback to original source
  }
}

export async function generateContractPDF(contract: Contract): Promise<void> {
  // Initialize standard A4 PDF: portrait, millimeters, 210x297
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const sigY = 244; // Vertical coordinate for signatures

  // Pre-fetch the ETECANOS FC logo as soon as possible
  const logoUrl = 'https://i.imgur.com/gLgiJ2x.png';
  const logoImg = await loadImage(logoUrl);

  // Color Palette Definitions
  const PRIMARY_BLUE = [2, 132, 199]; // #0284c7 (Sky Blue)
  const DARK_NAVY = [0, 43, 73];    // Rich contract navy
  const OFF_WHITE = [248, 250, 252]; // Background highlight
  const TEXT_DARK = [15, 23, 42];    // Slate-900 list text
  const TEXT_MUTED = [100, 116, 139]; // Slate-500 description text

  // 1. Draw elegant border & background highlights
  doc.setDrawColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
  doc.setLineWidth(1);
  doc.rect(8, 8, 194, 281); // External framing

  // Light margin accents
  doc.setDrawColor(226, 232, 240);
  doc.rect(10, 10, 190, 277);

  // 2. Club Logo and Header Decoration
  // Draw light blue background banner in header
  doc.setFillColor(DARK_NAVY[0], DARK_NAVY[1], DARK_NAVY[2]);
  doc.rect(10, 10, 190, 32, 'F');

  const drawFallbackLogo = () => {
    // SVG-esque drawings for team star/emblem on header if image fails to load
    doc.setFillColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
    doc.ellipse(28, 26, 11, 11, 'F');
    doc.setFillColor(255, 255, 255);
    doc.ellipse(28, 26, 9, 9, 'F');
    
    // Draw letter 'E' inside ball placeholder
    doc.setTextColor(DARK_NAVY[0], DARK_NAVY[1], DARK_NAVY[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('E', 28, 31, { align: 'center' });
  };

  if (logoImg) {
    try {
      // Draw background glow for the circular logo container
      doc.setFillColor(255, 255, 255);
      doc.ellipse(28, 26, 11.5, 11.5, 'F');
      
      // Add Etecanos FC official logo to header
      doc.addImage(logoImg, 'PNG', 17.5, 15.5, 21, 21);
    } catch (err) {
      console.error('Failed to draw header image: ', err);
      drawFallbackLogo();
    }
  } else {
    drawFallbackLogo();
  }

  // Header Typography
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('ETECANOS FUTEBOL CLUBE', 46, 23);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(186, 230, 253); // light sky blue text
  doc.text('Departamento de Futebol Profissional | CNPJ: 99.888.777/0001-01', 46, 29);
  doc.text('São Paulo - SP | Registro CBF nº 481.99', 46, 33);

  // 3. Middle Watermarked Transparent Logo - Moved below to empty signature area for text clarity

  // 4. Title of the Document
  doc.setTextColor(DARK_NAVY[0], DARK_NAVY[1], DARK_NAVY[2]);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CONTRATO ESPECIAL DE TRABALHO DESPORTIVO', 105, 52, { align: 'center' });

  // Thin line under title
  doc.setDrawColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
  doc.setLineWidth(0.5);
  doc.line(35, 55, 175, 55);

  let currentY = 64;

  // Helper to print bullet/field nicely
  const printField = (label: string, value: string, xLabel = 18, xValue = 68) => {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(DARK_NAVY[0], DARK_NAVY[1], DARK_NAVY[2]);
    doc.text(label, xLabel, currentY);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(value, xValue, currentY);
    currentY += 6;
  };

  // 5. Contract Details Block (white base highlighting so watermark looks beautiful behind it)
  doc.setFillColor(OFF_WHITE[0], OFF_WHITE[1], OFF_WHITE[2]);
  doc.rect(14, currentY - 5, 182, 38, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.rect(14, currentY - 5, 182, 38);

  // Contract data inputs
  printField('NOME DO ATLETA:', contract.playerName.toUpperCase());
  printField('CÓDIGO ÚNICO:', contract.code);
  printField('NÚMERO DA CAMISA:', contract.shirtNumber ? `${contract.shirtNumber}` : 'A definir (nº extra)');
  printField('POSIÇÃO:', contract.position);
  printField('SALÁRIO MENSAL:', formatCurrency(contract.salary));
  printField('VIGÊNCIA:', `${contract.durationMonths} meses (a partir de ${formatDateBr(contract.startDate)})`);

  currentY += 4;

  // 6. Clauses / Termos do Contrato
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(DARK_NAVY[0], DARK_NAVY[1], DARK_NAVY[2]);
  doc.text('CLÁUSULAS CONTRATUAIS REGULAMENTARES', 16, currentY);
  currentY += 5;

  const clauses = [
    {
      title: 'CLÁUSULA PRIMEIRA - DO OBJETO E FUNÇÃO:',
      text: `O atleta se compromete a prestar seus serviços desportivos profissionais de futebol ao ETECANOS FC, desempenhando suas funções em treinos, competições oficiais ou amistosas sob a orientação técnica do clube, atuando principalmente na posição de ${contract.position}.`
    },
    {
      title: 'CLÁUSULA SEGUNDA - DA VIGÊNCIA E EXCLUSIVIDADE:',
      text: `Este instrumento vigorará pelo prazo de ${contract.durationMonths} meses, iniciando-se em ${formatDateBr(contract.startDate)}. O atleta declara ter exclusividade e não possuir outros vínculos federativos ativos junto a agremiações de futebol sob penas estatutárias.`
    },
    {
      title: 'CLÁUSULA TERCEIRA - DA REMUNERAÇÃO:',
      text: `Pelo fiel cumprimento dos serviços acertados, o ETECANOS FC pagará mensalmente ao atleta a quantia de ${formatCurrency(contract.salary)} (mensais). Fica acordado o recebimento de bonificação regular e cobertura de despesas médicas caso decorrentes de atividades esportivas a serviço da agremiação.`
    },
    {
      title: 'CLÁUSULA QUARTA - DO COMPROMISSO E DISCIPLINA:',
      text: `O Atleta obriga-se a honrar as cores azul claro e branco do ETECANOS FC, comparecer pontualmente a todos os compromissos, manter boa conduta esportiva e prezar pelas diretrizes, integridade física, saúde fisiológica e o bom nome do clube dentro ou fora de campo.`
    }
  ];

  clauses.forEach((cl) => {
    // Clause title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(DARK_NAVY[0], DARK_NAVY[1], DARK_NAVY[2]);
    doc.text(cl.title, 16, currentY);
    currentY += 4.5;

    // Clause text split by page margins
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    const splitText = doc.splitTextToSize(cl.text, 178);
    doc.text(splitText, 16, currentY);
    currentY += (splitText.length * 4) + 2;
  });

  // Highlight Notes/Clauses if we have any
  if (contract.notes) {
    doc.setFillColor(240, 249, 255); // very light sky blue
    doc.rect(14, currentY - 2, 182, 14, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(PRIMARY_BLUE[0], PRIMARY_BLUE[1], PRIMARY_BLUE[2]);
    doc.text('OBSERVAÇÕES ESPECIAIS:', 17, currentY + 2);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(contract.notes, 17, currentY + 6, { maxWidth: 176 });
    currentY += 16;
  } else {
    currentY += 4;
  }

  // 6.5 Faded Watermarked Logo inside the empty visual area (red box requested by user)
  if (logoImg) {
    try {
      // 12% opacity keeps it soft yet beautifully visible as an official seal in the empty area
      const fadedLogo = getFadedImage(logoImg, 0.12);
      const watermarkSize = 42; 
      const watermarkX = 105 - (watermarkSize / 2);
      
      // Center vertically in the space between currentY and signatures start (sigY = 244)
      const spaceHeight = sigY - 10 - currentY;
      const watermarkY = currentY + (spaceHeight / 2) - (watermarkSize / 2);

      doc.addImage(
        fadedLogo,
        'PNG',
        watermarkX,
        watermarkY,
        watermarkSize,
        watermarkSize
      );
    } catch (err) {
      console.error('Failed to draw empty area watermark:', err);
    }
  }

  // 7. Signatures Area
  // Draw horizontal lines for signatures
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);

  // Line for President/Director
  doc.line(30, sigY, 90, sigY);
  // Line for Player
  doc.line(120, sigY, 180, sigY);

  // Signatures text Labels
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(DARK_NAVY[0], DARK_NAVY[1], DARK_NAVY[2]);
  doc.text('FLORENTINO PÉREZ', 60, sigY + 5, { align: 'center' });
  doc.text(contract.playerName.toUpperCase(), 150, sigY + 5, { align: 'center' });

  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Presidente do Club ETECANOS FC', 60, sigY + 9, { align: 'center' });
  doc.text('Assinatura Eletrônica do Atleta', 150, sigY + 9, { align: 'center' });

  // 8. Place actual athlete's eletronic signature image
  if (contract.signatureDataUrl && contract.status === 'SIGNED') {
    try {
      doc.addImage(contract.signatureDataUrl, 'PNG', 130, sigY - 18, 40, 16);
    } catch (e) {
      console.error('Falha ao adicionar imagem de assinatura ao PDF: ', e);
    }
  }

  // 9. Draw Club President simulated hand written signature "Florentino Pérez" (pen style)
  try {
    // Beautiful connected cursive text in high-density royal navy pen ink
    doc.setFont('Times', 'italic');
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138); // Royal Blue ink (dark blue)
    doc.text('Florentino Pérez', 60, sigY - 7, { align: 'center' });
    
    // Simulate real ink stroke details
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.4);
    doc.line(35, sigY - 6.5, 52, sigY - 4.5);
    doc.line(52, sigY - 4.5, 85, sigY - 7.5);
  } catch (err) {
    // Basic fallback squiggle
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.6);
    doc.line(42, sigY - 14, 88, sigY - 9);
  }

  // 10. Footer & Metadata validation bar
  const footerY = 276;
  doc.setFillColor(OFF_WHITE[0], OFF_WHITE[1], OFF_WHITE[2]);
  doc.rect(10, footerY - 4, 190, 11, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(10, footerY - 4, 200, footerY - 4);

  // Authentication line
  doc.setFont('Courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  const dateSignedStr = contract.signedAt ? formatDateBr(contract.signedAt) : formatDateBr(new Date().toISOString());
  const authHash = `ETEC-${contract.code}-${contract.id.substring(0, 4).toUpperCase()}`;
  doc.text(`CÓD: ${authHash} | REGISTRO AUTÊNTICO CBF CFT-09 | DATA DE EMISSÃO: ${dateSignedStr}`, 14, footerY + 1);
  
  // Page number
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Página 1 de 1', 194, footerY + 1, { align: 'right' });

  // Save the file
  const safePlayerName = contract.playerName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`contrato_etecanos_${safePlayerName}.pdf`);
}

export function formatDateTimeBr(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export async function generateBidCardPDF(contract: Contract): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const logoUrl = 'https://i.imgur.com/gLgiJ2x.png';
  const logoImg = await loadImage(logoUrl);

  const cardX = 25;
  const cardY = 40;
  const cardW = 160;
  const cardH = 95;

  // Let's draw an elegant background for the page first to make it look extremely premium
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(0, 0, 210, 297, 'F');

  // Title of page
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('REPUBLICA FEDERATIVA DO BRASIL', 105, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('RELAÇÃO DE ATLETAS - BOLETIM INFORMATIVO DIÁRIO (B.I.D.)', 105, 24, { align: 'center' });
  
  // Outer frame for the card
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.5);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, 'FD');

  // Card Header: Name in light blue text
  doc.setTextColor(2, 132, 199); // #0284c7 (Sky Blue)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(contract.playerName.toUpperCase(), cardX + 8, cardY + 12);

  // Grey separator line under name
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.line(cardX + 4, cardY + 18, cardX + cardW - 4, cardY + 18);

  // Photo
  const photoX = cardX + 8;
  const photoY = cardY + 24;
  const photoW = 34;
  const photoH = 44;

  let hasPhoto = false;
  if (contract.photoDataUrl) {
    try {
      doc.addImage(contract.photoDataUrl, 'JPEG', photoX, photoY, photoW, photoH);
      hasPhoto = true;
    } catch (e) {
      console.error('Failed to draw athlete headshot on BID card:', e);
    }
  }

  if (!hasPhoto) {
    // Draw fine placeholder for photo
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(photoX, photoY, photoW, photoH, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(photoX, photoY, photoW, photoH, 2, 2, 'D');

    // Draw little human avatar silhouette
    doc.setFillColor(203, 213, 225); // slate-300
    // Head:
    doc.ellipse(photoX + (photoW / 2), photoY + 16, 5, 5, 'F');
    // Body chest curve:
    doc.ellipse(photoX + (photoW / 2), photoY + 31, 10, 8, 'F');
    // Cover the lower overflow with sub-rect
    doc.setFillColor(241, 245, 249);
    doc.rect(photoX + 1, photoY + 31, photoW - 2, 12, 'F');

    // Draw avatar border line and label
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('SEM FOTO REGISTRADA', photoX + (photoW / 2), photoY + 39, { align: 'center' });
  }

  // Right column details (start drawing labels and values)
  const detailsX = cardX + 48;
  let detailY = cardY + 27;

  const printCardField = (label: string, value: string) => {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42); // slate-900 / dark
    doc.text(label, detailsX, detailY);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85); // slate-700
    
    const labelWidth = doc.getTextWidth(label) + 1.5;
    doc.text(value, detailsX + labelWidth, detailY);
    detailY += 7;
  };

  const bidNum = contract.bidNumber || '167958';
  const bidProt = contract.bidProtocol || '1681206SP';
  const pubDate = contract.signedAt ? formatDateTimeBr(contract.signedAt) : formatDateTimeBr(new Date().toISOString());
  const birthBr = contract.birthDate ? formatDateBr(contract.birthDate) : '01/01/2000';

  printCardField('Inscrição: ', bidNum);
  printCardField('Tipo Contrato: ', 'Contrato Definitivo');
  printCardField('Nº: ', bidProt);
  printCardField('Data início: ', formatDateBr(contract.startDate));
  printCardField('Nascimento: ', birthBr);
  printCardField('Data de Publicação: ', pubDate);

  // Bottom club logo & region signature tag
  const bottomLogoY = cardY + 74;
  if (logoImg) {
    try {
      doc.addImage(logoImg, 'PNG', detailsX, bottomLogoY, 13, 13);
    } catch (e) {
      console.error('Failed to draw bottom logo on BID card:', e);
    }
  } else {
    // Draw placeholder emblem
    doc.setFillColor(2, 132, 199);
    doc.ellipse(detailsX + 6.5, bottomLogoY + 6.5, 4, 4, 'F');
  }

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Etecanos / SP', detailsX + 16, bottomLogoY + 8);

  // Cut-out guidelines underneath card
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.2);
  doc.rect(cardX - 5, cardY - 5, cardW + 10, cardH + 10, 'D'); // Outer cutting line
  
  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.text('✄------------------ Linha de Corte Oficial para Plastificação ------------------✄', 105, cardY + cardH + 11, { align: 'center' });

  // Full validation cert lower part (Certificate layout)
  const certY = 158;
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, certY, 180, 110, 3, 3, 'FD');

  // Certificate Header
  doc.setFillColor(0, 43, 73); // DARK_NAVY
  doc.rect(15, certY, 180, 15, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CERTIFICADO OFICIAL DE REGISTRO - BOLETIM INFORMATIVO DIÁRIO', 105, certY + 9, { align: 'center' });

  doc.setTextColor(15, 23, 42); // Slate-900
  doc.setFontSize(9);
  doc.setFont('Helvetica', 'normal');
  
  const textX = 22;
  let textY = certY + 24;

  const printCertLine = (title: string, desc: string) => {
    doc.setFont('Helvetica', 'bold');
    doc.text(title, textX, textY);
    const titleWidth = doc.getTextWidth(title) + 1;
    doc.setFont('Helvetica', 'normal');
    doc.text(desc, textX + titleWidth, textY);
    textY += 6;
  };

  printCertLine('Razão Social: ', 'ETECANOS FUTEBOL CLUBE - Departamento de Registros');
  printCertLine('CNPJ Oficial: ', '99.888.777/0001-01');
  printCertLine('Nome Completo do Atleta: ', contract.playerName.toUpperCase());
  printCertLine('Inscrição no B.I.D.: ', bidNum);
  printCertLine('Protocolo de Registro: ', bidProt);
  printCertLine('Futebol de Atuação: ', contract.position.toUpperCase());
  printCertLine('Status do Registro: ', 'REGISTRO PUBLICADO E CONFIRMADO NO SINF (SISTEMA DE TRANSFERÊNCIAS)');
  printCertLine('Data de Inscrição: ', pubDate);
  printCertLine('Vigência Contratual: ', `Válido por ${contract.durationMonths} meses a contar da data de início ${formatDateBr(contract.startDate)}.`);

  textY += 4;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  const statementText = `Confirmamos para fins desportivos e de representação que o atleta supramencionado encontra-se devidamente registrado sob a Federação Paulista de Futebol (FPF) e no Boletim Informativo Diário (B.I.D.) da Confederação Brasileira de Futebol como integrante oficial do elenco Etecanos FC. A veracidade desta carteira desportiva digital pode ser atestada usando o código validador do contrato especial de trabalho.`;
  const splitStatement = doc.splitTextToSize(statementText, 166);
  doc.text(splitStatement, textX, textY);
  
  // Validation hash and signature
  const validationHash = `REG-BID-${bidNum}-${contract.code.toUpperCase()}`;
  doc.setFont('Courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`HASH DE CHANCELEIRA: ${validationHash}`, textX, certY + 104);

  // Save PDF
  const safePlayerName = contract.playerName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`carteirinha_bid_etecanos_${safePlayerName}.pdf`);
}
