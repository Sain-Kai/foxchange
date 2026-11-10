import type { Currency } from "@/types/graph";

export const FIAT_CURRENCIES: Currency[] = [
  { code: "USD", label: "US Dollar", flag: "🇺🇸", color: "#3b82f6" },
  { code: "EUR", label: "Euro", flag: "🇪🇺", color: "#8b5cf6" },
  { code: "GBP", label: "British Pound", flag: "🇬🇧", color: "#ec4899" },
  { code: "JPY", label: "Japanese Yen", flag: "🇯🇵", color: "#f43f5e" },
  { code: "INR", label: "Indian Rupee", flag: "🇮🇳", color: "#f97316" },
  { code: "AUD", label: "Australian Dollar", flag: "🇦🇺", color: "#eab308" },
  { code: "SGD", label: "Singapore Dollar", flag: "🇸🇬", color: "#22c55e" },
  { code: "CHF", label: "Swiss Franc", flag: "🇨🇭", color: "#14b8a6" },
  { code: "CAD", label: "Canadian Dollar", flag: "🇨🇦", color: "#06b6d4" },
  { code: "NZD", label: "New Zealand Dollar", flag: "🇳🇿", color: "#10b981" },
  { code: "SEK", label: "Swedish Krona", flag: "🇸🇪", color: "#6366f1" },
  { code: "HKD", label: "Hong Kong Dollar", flag: "🇭🇰", color: "#a855f7" },
];

export const CRYPTO_CURRENCIES: Currency[] = [
  { code: "USDT", label: "Tether USD", flag: "₮", color: "#26a17b", isCrypto: true },
  { code: "BTC", label: "Bitcoin", flag: "₿", color: "#f7931a", isCrypto: true },
  { code: "ETH", label: "Ethereum", flag: "Ξ", color: "#627eea", isCrypto: true },
  { code: "SOL", label: "Solana", flag: "◎", color: "#14f195", isCrypto: true },
  { code: "BNB", label: "BNB Chain", flag: "⬡", color: "#f3ba2f", isCrypto: true },
  { code: "XRP", label: "XRP", flag: "✕", color: "#23292f", isCrypto: true },
  { code: "DOGE", label: "Dogecoin", flag: "Ð", color: "#c2a633", isCrypto: true },
  { code: "ADA", label: "Cardano", flag: "₳", color: "#0033ad", isCrypto: true },
];

export const DEFAULT_CURRENCIES: Currency[] = FIAT_CURRENCIES.slice(0, 8);

export const ALL_CURRENCIES: Currency[] = [...FIAT_CURRENCIES, ...CRYPTO_CURRENCIES];

export const CURRENCY_CODES = DEFAULT_CURRENCIES.map((c) => c.code);
export const CRYPTO_CODES = CRYPTO_CURRENCIES.map((c) => c.code);

export const CURRENCY_MAP = Object.fromEntries(
  ALL_CURRENCIES.map((c) => [c.code, c])
) as Record<string, Currency>;
