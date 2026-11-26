export interface ParsedAccountDetails {
  accountName: string | null;
  accountNumber: string;
}

const DELIMITER = ' | ';

export function formatAccountDetails(accountName: string, accountNumber: string): string {
  const cleanName = accountName.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanNumber = accountNumber.replace(/\|/g, '').trim();
  return `${cleanName}${DELIMITER}${cleanNumber}`;
}

export function parseAccountDetails(rawValue: string): ParsedAccountDetails {
  const value = (rawValue ?? '').trim();
  const separatorIndex = value.indexOf(DELIMITER);

  if (separatorIndex === -1) {
    return {
      accountName: null,
      accountNumber: value,
    };
  }

  const namePart = value.slice(0, separatorIndex).trim();
  const numberPart = value.slice(separatorIndex + DELIMITER.length).trim();

  return {
    accountName: namePart || null,
    accountNumber: numberPart || value,
  };
}
