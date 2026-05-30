import { env } from '../env.js';
import { logger } from '../lib/logger.js';
import { ServiceUnavailable } from '../lib/errors.js';

const MAVAPAY_TIMEOUT_MS = 15_000;

function readHeaders(): Record<string, string> {
  return {
    'X-API-KEY': env.MAVAPAY_READ_KEY ?? '',
    'Content-Type': 'application/json',
  };
}

function writeHeaders(): Record<string, string> {
  return {
    'X-API-KEY': env.MAVAPAY_WRITE_KEY ?? '',
    'Content-Type': 'application/json',
  };
}

async function apiPost<T>(
  path: string,
  body: unknown,
  keyType: 'read' | 'write' = 'write',
): Promise<T> {
  const url = `${env.MAVAPAY_BASE_URL}${path}`;
  const headers = keyType === 'read' ? readHeaders() : writeHeaders();
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(MAVAPAY_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error({ path, status: res.status, body: text.slice(0, 500) }, 'MavaPay API error');
    throw new ServiceUnavailable(`MavaPay ${path} returned ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function apiGet<T>(
  path: string,
  params: Record<string, string>,
  keyType: 'read' | 'write' = 'read',
): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const url = `${env.MAVAPAY_BASE_URL}${path}?${qs}`;
  const headers = keyType === 'read' ? readHeaders() : writeHeaders();
  const res = await fetch(url, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(MAVAPAY_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error({ path, status: res.status, body: text.slice(0, 500) }, 'MavaPay API error');
    throw new ServiceUnavailable(`MavaPay ${path} returned ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PayInQuoteResult {
  quoteId: string;
  orderId: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  bankCode: string;
  totalAmountKobo: number;
  expiresAt: string;
}

export interface NameEnquiryParams {
  bankCode: string;
  accountNumber: string;
}

export interface NameEnquiryResult {
  accountName: string;
  accountNumber: string;
}

export interface Beneficiary {
  bankAccountNumber: string;
  bankAccountName: string;
  bankCode: string;
  bankName: string;
}

export interface ReleaseResult {
  vendorAmountKobo: number;
  feeKobo: number;
}

// ---------------------------------------------------------------------------
// Pay-in quote: NGNKOBO → BTCSAT via BANKTRANSFER, buyer deposits NGN into
// a virtual bank account. MavaPay converts NGN→BTC and credits our wallet.
// ---------------------------------------------------------------------------

export async function createPayInQuote(
  amountKobo: number,
  customerReference: string,
): Promise<PayInQuoteResult> {
  const raw = await apiPost<MavaPayResponse<QuoteData>>(
    '/api/v1/quote',
    {
      amount: String(amountKobo),
      sourceCurrency: 'NGNKOBO',
      targetCurrency: 'BTCSAT',
      paymentMethod: 'BANKTRANSFER',
      paymentCurrency: 'NGNKOBO',
      customerReference,
      autopayout: false,
    },
    'write',
  );

  const d = raw.data;
  return {
    quoteId: d.id,
    orderId: d.orderId,
    bankName: d.bankName ?? '',
    bankAccountNumber: d.ngnBankAccountNumber ?? '',
    bankAccountName: d.ngnAccountName ?? '',
    bankCode: d.ngnBankCode ?? '',
    totalAmountKobo: d.totalAmountInSourceCurrency,
    expiresAt: d.expiry,
  };
}

// ---------------------------------------------------------------------------
// Wallet balance
// ---------------------------------------------------------------------------

interface WalletData {
  id: string;
  accountId: string;
  currency: string;
  balance: number;
}

export async function getBtcWalletBalance(): Promise<number> {
  const url = `${env.MAVAPAY_BASE_URL}/api/v1/wallet`;
  const res = await fetch(url, {
    headers: readHeaders(),
    signal: AbortSignal.timeout(MAVAPAY_TIMEOUT_MS),
  });
  if (!res.ok) return 0;
  const raw = (await res.json()) as MavaPayResponse<WalletData[]>;
  const btcWallet = raw.data.find((w) => w.currency === 'BTC');
  return btcWallet?.balance ?? 0;
}

// ---------------------------------------------------------------------------
// Simulation (staging only)
// ---------------------------------------------------------------------------

export async function simulatePayIn(
  amountKobo: number,
  options: { orderId?: string; quoteId?: string },
): Promise<void> {
  const body: Record<string, unknown> = {
    currency: 'NGN',
    amount: amountKobo,
  };
  if (options.quoteId) body.quoteId = options.quoteId;
  if (options.orderId) body.orderId = options.orderId;

  await apiPost<MavaPayResponse<string>>(
    '/api/v1/simulation/pay-in',
    body,
    'write',
  );
}

// ---------------------------------------------------------------------------
// Name Enquiry — verify bank account details before payout
// ---------------------------------------------------------------------------

export async function nameEnquiry(
  params: NameEnquiryParams,
): Promise<NameEnquiryResult> {
  const raw = await apiGet<
    MavaPayResponse<{ accountName: string; accountNumber: string }>
  >(
    '/api/v1/bank/name-enquiry',
    { accountNumber: params.accountNumber, bankCode: params.bankCode },
    'read',
  );

  return {
    accountName: raw.data.accountName,
    accountNumber: raw.data.accountNumber,
  };
}

// ---------------------------------------------------------------------------
// Release flow: BTCSAT→NGNKOBO quote with autopayout + internal accept.
// Applies the 1% SafeSale fee.
// ---------------------------------------------------------------------------

export async function releaseToVendor(
  amountKobo: number,
  beneficiary: Beneficiary,
  reference: string,
): Promise<ReleaseResult> {
  const vendorAmount = Math.floor(amountKobo * 0.99);
  const feeKobo = amountKobo - vendorAmount;

  // Create a BTCSAT→NGNKOBO quote with autopayout=true + beneficiary.
  // MavaPay debits our BTC wallet, converts to NGN, and sends to vendor's bank.
  const raw = await apiPost<MavaPayResponse<QuoteData>>(
    '/api/v1/quote',
    {
      amount: vendorAmount,
      sourceCurrency: 'BTCSAT',
      targetCurrency: 'NGNKOBO',
      paymentMethod: 'LIGHTNING',
      paymentCurrency: 'NGNKOBO',
      customerReference: reference,
      autopayout: true,
      beneficiary: {
        bankAccountNumber: beneficiary.bankAccountNumber,
        bankAccountName: beneficiary.bankAccountName,
        bankCode: beneficiary.bankCode,
        bankName: beneficiary.bankName,
      },
    },
    'write',
  );

  // Accept the quote internally — debits BTC wallet instead of waiting
  // for an external Lightning payment to the returned invoice.
  await apiPost<MavaPayResponse<string>>(
    `/api/v1/wallet/payout/${raw.data.id}/accept`,
    { sourceWallet: 'BTC' },
    'write',
  );

  return { vendorAmountKobo: vendorAmount, feeKobo };
}

// ---------------------------------------------------------------------------
// Internal response types for MavaPay API
// ---------------------------------------------------------------------------

interface MavaPayResponse<T> {
  status: string;
  message?: string;
  data: T;
}

interface QuoteData {
  id: string;
  orderId: string;
  bankName?: string;
  ngnBankAccountNumber?: string;
  ngnAccountName?: string;
  ngnBankCode?: string;
  totalAmountInSourceCurrency: number;
  amountInSourceCurrency: number;
  amountInTargetCurrency: number;
  expiry: string;
  isValid: boolean;
  exchangeRate: number;
  paymentMethod: string;
  transactionFeesInSourceCurrency: number;
  customerInternalFee: number;
  invoice?: string;
  hash?: string;
}
