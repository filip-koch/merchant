/**
 * Calculates the Czech IBAN check digits and returns the full IBAN.
 *
 * Czech IBAN structure: CZkk BBBB PPPPPP CCCCCCCCCC
 * Where:
 * - CZ: Country code
 * - kk: Check digits (calculated via mod-97)
 * - BBBB: Bank ID (4 digits)
 * - PPPPPP: Account prefix (6 digits, zero-padded)
 * - CCCCCCCCCC: Main account number (10 digits, zero-padded)
 *
 * @param {string} accountNumber - e.g. '19-2000145399' or '2000145399'
 * @param {string} bankId - 4-digit bank code, e.g. '0800'
 * @returns {string} The full computed IBAN
 */
export function getCzechIban(accountNumber, bankId) {
  let prefix = '000000';
  let mainNumber = '';

  const cleanAccount = accountNumber.trim();
  if (cleanAccount.includes('-')) {
    const parts = cleanAccount.split('-');
    prefix = parts[0].replace(/\D/g, '').padStart(6, '0');
    mainNumber = parts[1].replace(/\D/g, '').padStart(10, '0');
  } else {
    mainNumber = cleanAccount.replace(/\D/g, '').padStart(10, '0');
  }

  const cleanBankId = bankId.trim().replace(/\D/g, '').padStart(4, '0');

  // Rearrange for IBAN mod-97 check digit calc:
  // numeric = BBBB + PPPPPP + CCCCCCCCCC + 1235 (C=12, Z=35) + 00
  const numericStr = `${cleanBankId}${prefix}${mainNumber}123500`;

  const mod = Number(BigInt(numericStr) % 97n);
  const checkDigits = (98 - mod).toString().padStart(2, '0');

  return `CZ${checkDigits}${cleanBankId}${prefix}${mainNumber}`;
}

/**
 * Generates a Short Payment Descriptor (SPAYD) string for Czech QR payments.
 * Format: SPD*1.0*ACC:{IBAN}*AM:{Amount}*CC:CZK*MSG:{Message}
 *
 * @param {string} iban - Recipient IBAN
 * @param {number} amount - Amount in CZK
 * @param {string} [message] - Optional payment message (max 60 ASCII chars)
 * @returns {string} SPAYD string
 */
export function generateSpaydString(iban, amount, message = 'POS-Platba') {
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  const formattedAmount = amount.toFixed(2);

  // Sanitize: strip diacritics, remove SPAYD delimiter asterisks, cap at 60 chars
  const sanitizedMsg = message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[*]/g, ' ')
    .substring(0, 60);

  return `SPD*1.0*ACC:${cleanIban}*AM:${formattedAmount}*CC:CZK*MSG:${sanitizedMsg}`;
}

/**
 * Validates a Czech bank account number format.
 * Accepts: "12345678" or "19-12345678"
 *
 * @param {string} account
 * @returns {boolean}
 */
export function validateCzechAccount(account) {
  const clean = account.trim();
  if (!clean) return false;
  return /^\d{1,10}$/.test(clean) || /^\d{1,6}-\d{1,10}$/.test(clean);
}

/**
 * Validates a Czech bank code (exactly 4 digits).
 *
 * @param {string} bankId
 * @returns {boolean}
 */
export function validateBankId(bankId) {
  return /^\d{4}$/.test(bankId.trim());
}

/** Major Czech banks for quick-select UI */
export const CZECH_BANKS = [
  { code: '0100', name: 'Komerční banka' },
  { code: '0300', name: 'ČSOB' },
  { code: '0800', name: 'Česká spořitelna' },
  { code: '2010', name: 'Fio banka' },
  { code: '2700', name: 'UniCredit Bank' },
  { code: '3030', name: 'Air Bank' },
  { code: '5500', name: 'Raiffeisenbank' },
  { code: '6000', name: 'PPF banka' },
  { code: '7910', name: 'mBank' },
  { code: '8030', name: 'Equa bank' },
];
