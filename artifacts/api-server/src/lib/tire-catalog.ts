import { isIP } from "node:net";
import { load } from "cheerio";
import type { Tire, TireCatalog } from "@workspace/api-zod";

/**
 * Demo mode is deliberately the default. A donor URL is never fetched until
 * this is changed after checking the site's terms and permitted request rate.
 */
const DONOR_SOURCE = {
  mode: "demo" as "demo" | "donor",
  url: "https://example.com/truck-tires",
  cacheMs: 5 * 60 * 1000,
  timeoutMs: 8_000,
  maxHtmlBytes: 1_500_000,
};

/**
 * Example selectors for the fixture below. A real donor page will usually need
 * different selectors, based on its public HTML structure.
 */
const SELECTORS = {
  product: "[data-tire]",
  id: "data-id",
  brand: "[data-brand]",
  model: "[data-model]",
  country: "[data-country]",
  size: "[data-size]",
  width: "[data-width]",
  profile: "[data-profile]",
  diameter: "[data-diameter]",
  axle: "[data-axle]",
  speed: "[data-speed]",
  load: "[data-load]",
  price: "[data-price]",
  availability: "[data-availability]",
  image: "img[data-image]",
} as const;

const DEMO_DONOR_HTML = `
<main>
  <article data-tire data-id="ovation-vi-702">
    <span data-brand="OVATION"></span><span data-model="VI-702"></span>
    <span data-country="Импортная"></span><span data-size="7.50R16"></span>
    <span data-width="7.50 MM"></span><span data-profile="0%"></span>
    <span data-diameter="16""></span><span data-axle="Универсальная"></span>
    <span data-speed="M"></span><span data-load="122/118"></span>
    <span data-price="10657"></span><span data-availability="В наличии"></span>
  </article>

  <article data-tire data-id="ovation-vi-660-215">
    <span data-brand="OVATION"></span><span data-model="VI-660"></span>
    <span data-country="Импортная"></span><span data-size="215/75R17.5"></span>
    <span data-width="215 MM"></span><span data-profile="75%"></span>
    <span data-diameter="17.5""></span><span data-axle="Рулевая/Прицепная"></span>
    <span data-speed="J"></span><span data-load="135/133"></span>
    <span data-price="11101"></span><span data-availability="В наличии"></span>
  </article>

  <article data-tire data-id="ovation-vi-660-315">
    <span data-brand="OVATION"></span><span data-model="VI-660"></span>
    <span data-country="Импортная"></span><span data-size="315/70R22.5"></span>
    <span data-width="315 MM"></span><span data-profile="70%"></span>
    <span data-diameter="22.5""></span><span data-axle="Рулевая"></span>
    <span data-speed="L/M"></span><span data-load="154/150"></span>
    <span data-price="21313"></span><span data-availability="В наличии"></span>
  </article>

  <article data-tire data-id="ovation-vi-638">
    <span data-brand="OVATION"></span><span data-model="VI-638"></span>
    <span data-country="Импортная"></span><span data-size="11R22.5"></span>
    <span data-width="11 MM"></span><span data-profile="0%"></span>
    <span data-diameter="22.5""></span><span data-axle="Ведущая"></span>
    <span data-speed="M"></span><span data-load="148/145"></span>
    <span data-price="23144"></span><span data-availability="В наличии"></span>
  </article>
</main>
`;

let cachedCatalog: { value: TireCatalog; expiresAt: number } | undefined;

function readLimitedHtml(response: Response): Promise<string> {
  return (async () => {
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > DONOR_SOURCE.maxHtmlBytes) {
      throw new Error("Donor page exceeds the configured size limit");
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const html = await response.text();
      if (Buffer.byteLength(html, "utf8") > DONOR_SOURCE.maxHtmlBytes) {
        throw new Error("Donor page exceeds the configured size limit");
      }
      return html;
    }

    const decoder = new TextDecoder();
    let html = "";
    let bytesRead = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytesRead += value.byteLength;
        if (bytesRead > DONOR_SOURCE.maxHtmlBytes) {
          await reader.cancel();
          throw new Error("Donor page exceeds the configured size limit");
        }
        html += decoder.decode(value, { stream: true });
      }
      return html + decoder.decode();
    } finally {
      reader.releaseLock();
    }
  })();
}

async function fetchDonorHtml(): Promise<string> {
  const url = new URL(DONOR_SOURCE.url);
  const hostname = url.hostname.toLowerCase();

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    isIP(hostname) !== 0 ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Donor URL must be a public HTTPS hostname");
  }

  const response = await fetch(url, {
    headers: { accept: "text/html" },
    redirect: "error",
    signal: AbortSignal.timeout(DONOR_SOURCE.timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Donor page returned HTTP ${response.status}`);
  }

  if (!response.headers.get("content-type")?.toLowerCase().includes("text/html")) {
    throw new Error("Donor response is not HTML");
  }

  return readLimitedHtml(response);
}

function parseTireHtml(html: string, baseUrl: string): Tire[] {
  const $ = load(html);
  const cards = $(SELECTORS.product).toArray();

  const parsed = cards.map((card, index): Tire => {
    const item = $(card);
    const value = (selector: string) => item.find(selector).first().text().trim();
    const attribute = (name: string) => item.attr(name)?.trim() ?? "";
    const rawPrice = value(SELECTORS.price) || item.find(SELECTORS.price).first().attr("data-price")?.trim() || "";
    const price = Number(rawPrice.replace(/\D/g, ""));
    const axleText = value(SELECTORS.axle) || item.find(SELECTORS.axle).first().attr("data-axle")?.trim() || "";
    const axle = axleText.toLocaleLowerCase("ru-RU") as Tire["axle"];

    const requiredValues = [
      attribute(SELECTORS.id),
      value(SELECTORS.brand) || item.find(SELECTORS.brand).first().attr("data-brand")?.trim() || "",
      value(SELECTORS.model) || item.find(SELECTORS.model).first().attr("data-model")?.trim() || "",
      value(SELECTORS.country) || item.find(SELECTORS.country).first().attr("data-country")?.trim() || "",
      value(SELECTORS.size) || item.find(SELECTORS.size).first().attr("data-size")?.trim() || "",
      value(SELECTORS.width) || item.find(SELECTORS.width).first().attr("data-width")?.trim() || "",
      value(SELECTORS.profile) || item.find(SELECTORS.profile).first().attr("data-profile")?.trim() || "",
      value(SELECTORS.diameter) || item.find(SELECTORS.diameter).first().attr("data-diameter")?.trim() || "",
      value(SELECTORS.speed) || item.find(SELECTORS.speed).first().attr("data-speed")?.trim() || "",
      value(SELECTORS.load) || item.find(SELECTORS.load).first().attr("data-load")?.trim() || "",
      value(SELECTORS.availability) || item.find(SELECTORS.availability).first().attr("data-availability")?.trim() || "",
    ];

    if (
      requiredValues.some((entry) => !entry) ||
      !["рулевая", "ведущая", "прицепная"].includes(axle) ||
      !Number.isSafeInteger(price) ||
      price <= 0
    ) {
      throw new Error(`Donor product ${index + 1} is missing required catalog fields`);
    }

    const rawImageUrl = item.find(SELECTORS.image).first().attr("src")?.trim();
    let imageUrl: string | null = null;
    if (rawImageUrl) {
      try {
        const resolvedImage = new URL(rawImageUrl, baseUrl);
        if (resolvedImage.protocol === "https:" && resolvedImage.origin === new URL(baseUrl).origin) {
          imageUrl = resolvedImage.href;
        }
      } catch {
        imageUrl = null;
      }
    }

    return {
      id: attribute(SELECTORS.id),
      brand: requiredValues[1],
      model: requiredValues[2],
      country: requiredValues[3],
      size: requiredValues[4],
      width: requiredValues[5],
      profile: requiredValues[6],
      diameter: requiredValues[7],
      axle,
      speed: requiredValues[8],
      load: requiredValues[9],
      price,
      availability: requiredValues[10],
      imageUrl,
    };
  });

  if (!parsed.length) {
    throw new Error("No tire cards matched the configured donor selectors");
  }

  return parsed;
}

export async function getTireCatalog(): Promise<TireCatalog> {
  if (cachedCatalog && cachedCatalog.expiresAt > Date.now()) {
    return cachedCatalog.value;
  }

  const sourceUrl = DONOR_SOURCE.url;
  const html =
    DONOR_SOURCE.mode === "demo" ? DEMO_DONOR_HTML : await fetchDonorHtml();
  const products = parseTireHtml(html, sourceUrl);
  const value: TireCatalog = {
    source: DONOR_SOURCE.mode,
    fetchedAt: new Date(),
    products,
  };

  cachedCatalog = {
    value,
    expiresAt: Date.now() + DONOR_SOURCE.cacheMs,
  };

  return value;
}
