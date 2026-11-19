export type Role = 'ADMIN' | 'PARTNER' | 'TREASURER';

export type CardCategory =
  | 'AVULSA'
  | 'EX_ESPECIAL'
  | 'BORDA_AMARELA'
  | 'KIT_8_AMARELA'
  | 'KIT_15_CINZA'
  | 'LOTE_COMPRA'
  | 'LACRADO';

export type CardCondition = 'NM' | 'SP' | 'MP' | 'HP' | 'D';

export interface UserProfile {
  id: string;
  nome: string;
  email: string;
  role: Role;
  pixKey: string;
  comissaoPct: number;
}

export interface Customer {
  id: string;
  nome: string;
  telefone: string;
  handleSocial?: string;
  observacoes?: string;
  createdAt: string;
}

export interface Purchase {
  id: string;
  userId: string;
  vendedor: string;
  descricao: string;
  categoria: CardCategory;
  condicao: CardCondition;
  colecaoNumero?: string;
  valorCompraCentavos: number;
  valorAlocadoCentavos: number;
  valorLigaCentavos?: number | null;
  statusPagamento: 'Pago' | 'Pendente';
  statusEstoque: 'Disponivel' | 'Parcial' | 'Vendido';
  imagemUrl?: string;
  dataCompra: string;
  createdAt: string;
}

export interface Auction {
  id: string;
  nomeLeilao: string;
  responsavelId: string;
  responsavelNome: string;
  dataLeilao: string;
  totalEsperadoCentavos: number;
  totalArrematadoCentavos: number;
  statusRepasse: 'Pendente' | 'Em Conferencia' | 'Repassado';
  createdAt: string;
}

export interface Sale {
  id: string;
  userId: string;
  customerId: string;
  compradorNome: string;
  compradorTelefone: string;
  auctionId: string;
  leilaoNome: string;
  descricao: string;
  quantidade: number;
  valorArremateCentavos: number;
  custoVinculadoCentavos: number;
  lucroCentavos: number;
  statusPagamento: 'Pago' | 'Pendente' | 'Atrasado';
  comprovantePixUrl?: string;
  statusConciliacao: 'Pendente' | 'Conciliado';
  imagemUrl?: string;
  dataVenda: string;
  createdAt: string;
}

export interface Reconciliation {
  id: string;
  saleId: string;
  purchaseId: string;
  custoAlocadoCentavos: number;
  tipoMatch: 'AUTO' | 'MANUAL' | 'RATEIO_LOTE';
  scoreSimilaridade?: number;
  createdAt: string;
}

export interface UploadErrorRow {
  row: number;
  column: string;
  value: string;
  message: string;
}

export interface ParsedPurchaseDraftRow {
  rowNumber: number;
  vendedor: string;
  descricao: string;
  valorBRL: string;
  valorCentavos: number;
  statusPagamento: 'Pago' | 'Pendente';
  categoria: CardCategory;
}

export interface ParsedSaleDraftRow {
  rowNumber: number;
  compradorNome: string;
  compradorTelefone: string;
  leilaoNome: string;
  descricao: string;
  valorBRL: string;
  valorCentavos: number;
  statusPagamento: 'Pago' | 'Pendente';
}

export interface ParsedSpreadsheetResult<T = ParsedPurchaseDraftRow | ParsedSaleDraftRow> {
  module: 'compras' | 'vendas';
  fileName: string;
  validRows: T[];
  errors: UploadErrorRow[];
  summary: {
    totalRead: number;
    validCount: number;
    errorCount: number;
    totalValorBRL: string;
  };
}

export interface MatchSuggestion {
  saleId: string;
  saleDescricao: string;
  saleValorBRL: string;
  purchaseId: string;
  purchaseDescricao: string;
  purchaseVendedor: string;
  purchaseValorBRL: string;
  purchaseDisponivelCentavos: number;
  score: number;
  lucroEstimadoCentavos: number;
  lucroEstimadoBRL: string;
}

export interface BidSuggestion {
  categoria: CardCategory;
  valorLigaBRL: string;
  lanceInicialCentavos: number;
  lanceInicialBRL: string;
  incrementoCentavos: number;
  incrementoBRL: string;
  proximosLancesBRL: string[];
  regraAplicada: string;
}

export interface PokemonCardCatalogItem {
  id: string;
  name: string;
  number: string;
  setTotal: string;
  setName: string;
  rarity: string;
  imageUrl: string;
  displayLabel: string;
}

export interface TcgDatabaseState {
  profiles: UserProfile[];
  customers: Customer[];
  purchases: Purchase[];
  auctions: Auction[];
  sales: Sale[];
  reconciliations: Reconciliation[];
}
