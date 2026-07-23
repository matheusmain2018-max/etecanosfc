export interface Contract {
  id: string;
  playerName: string;
  position: string;
  salary: number; // Monthly salary in R$
  durationMonths: number; // Duration in months (e.g. 12, 24)
  startDate: string; // ISO date string or formatted date
  notes?: string; // Special clauses or bonus conditions
  code: string; // Unique contract validation code / password (e.g., BL-4819)
  status: 'PENDING' | 'SIGNED';
  signatureDataUrl?: string; // Image base64 containing the contract visual signature
  signedAt?: string; // Timestamp when it was signed
  shirtNumber?: number; // Fun field for a soccer player
  birthDate?: string; // Date of birth input by player at signing time
  photoDataUrl?: string; // Optional custom player headshot uploaded at signing time
  bidNumber?: string; // Auto-generated 6-digit BID enrollment code
  bidProtocol?: string; // Auto-generated contract register protocol (e.g., "1681206SP")
  overallRating?: number; // Configurable FUT Overall card rating (e.g., 50 to 99)
}

export type ActiveTab = 'elenco' | 'player' | 'admin';
