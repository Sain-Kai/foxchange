import { buildFiatRateMatrix, buildCryptoRateMatrix } from "@/lib/rates";
import { CURRENCY_CODES, CRYPTO_CODES } from "@/lib/currencies";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const market = (searchParams.get("market") || "fiat").toLowerCase();
  const date = searchParams.get("date") ?? undefined;
  const symbolsParam = searchParams.get("currencies");

  try {
    if (market === "crypto") {
      const tokens = symbolsParam ? symbolsParam.split(",") : CRYPTO_CODES;
      const { matrix, timestamp, source } = await buildCryptoRateMatrix(tokens);
      return NextResponse.json({
        rates: matrix,
        market: "crypto",
        timestamp,
        source,
        stale: false,
      });
    }

    // Default: Fiat rates
    const currencies = symbolsParam ? symbolsParam.split(",") : CURRENCY_CODES;
    const { matrix, date: rateDate, source } = await buildFiatRateMatrix(currencies, date);
    return NextResponse.json({
      rates: matrix,
      market: "fiat",
      date: rateDate,
      timestamp: new Date().toISOString(),
      source,
      stale: false,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch rates", message: String(err) },
      { status: 503 }
    );
  }
}
