import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin, sendJson } from "./_lib/core";
import { commitFiles, missingEnv, readText, repoConf, type FileChange, type RepoConf } from "./_lib/github";
import {
  type Product,
  type Variant,
  parseProductsJs,
  productHtml,
  sitemapAdd,
  sitemapRemove,
  slugify,
  writeProductsJs,
} from "./_lib/template";

interface VariantIn {
  option1?: unknown;
  price?: unknown;
  available?: unknown;
}

interface ProductIn {
  handle?: unknown;
  title?: unknown;
  description?: unknown;
  type?: unknown;
  tags?: unknown;
  price?: unknown;
  compare_at_price?: unknown;
  category_name?: unknown;
  category_emoji?: unknown;
  images?: unknown;
  option_name?: unknown;
  variants?: unknown;
  in_stock?: unknown;
}

const EMOJI: Record<string, string> = {
  Clothing: "👗", Fashion: "👗", Watches: "⌚", Beauty: "💄", Footwear: "👟", Jewelry: "💍",
  Electronics: "🔋", Home: "🏠", Food: "🍿", Sarees: "🥻", Kurtis: "👚", Toys: "🧸", Baby: "🍼",
};

class Bad extends Error {}

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

function num(v: unknown, label: string): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) throw new Bad(`${label} is invalid`);
  return n;
}

function build(input: ProductIn, existing: Product | undefined, all: Product[]): Product {
  const title = str(input.title, 300);
  if (title.length < 3) throw new Bad("Title is too short");
  const price = num(input.price, "Price");
  if (price <= 0) throw new Bad("Price must be above 0");
  const cmpRaw = input.compare_at_price;
  const compare = cmpRaw === undefined || cmpRaw === null || cmpRaw === "" ? 0 : num(cmpRaw, "MRP");

  const images = (Array.isArray(input.images) ? input.images : [])
    .map((u) => str(u, 1000))
    .filter((u) => /^https?:\/\//i.test(u));
  if (!images.length) throw new Bad("Add at least one image");
  if (images.length > 12) throw new Bad("Max 12 images");

  const category = str(input.category_name, 40) || "All";
  const emoji = str(input.category_emoji, 8) || all.find((p) => p.category_name === category)?.category_emoji || EMOJI[category] || "🛍️";
  const tags = (Array.isArray(input.tags) ? input.tags : typeof input.tags === "string" ? input.tags.split(",") : [])
    .map((t) => str(t, 40))
    .filter(Boolean)
    .slice(0, 20);

  let id: number;
  let handle: string;
  if (existing) {
    id = existing.id;
    handle = existing.handle;
  } else {
    id = all.reduce((m, p) => Math.max(m, p.id), 0) + 1;
    const base = slugify(str(input.handle, 120) || title).slice(0, 100);
    handle = base;
    for (let n = 2; all.some((p) => p.handle === handle); n++) handle = `${base}-${n}`;
  }

  const inStock = input.in_stock !== false;
  const optName = str(input.option_name, 30);
  const vin = (Array.isArray(input.variants) ? input.variants : []) as VariantIn[];
  const usedIds = new Set<number>();
  const mk = (option1: string, vPrice: number, available: boolean): Variant => {
    const prev = existing?.variants.find((v) => v.option1 === option1 && !usedIds.has(v.id));
    let vid = prev?.id ?? 0;
    if (!vid) {
      vid = id * 1000 + 1;
      while (usedIds.has(vid) || existing?.variants.some((v) => v.id === vid)) vid++;
    }
    usedIds.add(vid);
    return { id: vid, sku: prev?.sku ?? "", price: vPrice, compare_at_price: compare, option1, option2: "", available };
  };

  let variants: Variant[];
  let option1Name = "Title";
  const named = vin.map((v) => ({ o: str(v.option1, 40), p: v.price, a: v.available !== false })).filter((v) => v.o);
  if (optName && named.length > 1) {
    const seen = new Set<string>();
    variants = named
      .filter((v) => (seen.has(v.o) ? false : (seen.add(v.o), true)))
      .map((v) => mk(v.o, v.p === undefined || v.p === "" ? price : num(v.p, `Price of ${v.o}`), v.a && inStock));
    option1Name = optName;
  } else {
    variants = [mk("Default Title", price, inStock)];
  }

  return {
    handle,
    title,
    description: str(input.description, 5000),
    vendor: "AVIORCART",
    type: str(input.type, 60),
    tags,
    status: "active",
    price,
    compare_at_price: compare,
    option1_name: option1Name,
    option2_name: "",
    variants,
    images,
    id,
    category_emoji: emoji,
    category_name: category,
  };
}

async function load(c: RepoConf) {
  const txt = await readText(c, "assets/products.js");
  if (txt === null) throw new Error("assets/products.js not found in the main repo");
  return parseProductsJs(txt);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const c = repoConf();
  if (!c) return sendJson(res, 500, { error: `Missing Vercel env: ${missingEnv().join(", ")}` });

  try {
    if (req.method === "GET") {
      const parsed = await load(c);
      return sendJson(res, 200, { products: parsed.products });
    }
    if (req.method !== "POST") return sendJson(res, 405, { error: "GET or POST only" });

    const body = (req.body ?? {}) as { action?: unknown; product?: ProductIn; handle?: unknown };

    for (let attempt = 0; attempt < 2; attempt++) {
      const parsed = await load(c);
      const all = parsed.products;
      const files: FileChange[] = [];
      let message = "";
      let result: Product | null = null;

      if (body.action === "save") {
        const input = body.product ?? {};
        const existing = typeof input.handle === "string" ? all.find((p) => p.handle === input.handle) : undefined;
        const p = build(input, existing, all);
        const next = existing ? all.map((x) => (x.handle === p.handle ? p : x)) : [...all, p];
        files.push({ path: "assets/products.js", content: writeProductsJs(parsed, next) });
        files.push({ path: `products/${p.handle}.html`, content: productHtml(p, next) });
        if (!existing) {
          const sm = await readText(c, "sitemap.xml");
          if (sm) files.push({ path: "sitemap.xml", content: sitemapAdd(sm, p.handle) });
        }
        message = `${existing ? "Update" : "Add"} product: ${p.title.slice(0, 60)} (via dashboard)`;
        result = p;
      } else if (body.action === "delete") {
        const handle = typeof body.handle === "string" ? body.handle : "";
        const existing = all.find((p) => p.handle === handle);
        if (!existing) throw new Bad("Product not found");
        files.push({ path: "assets/products.js", content: writeProductsJs(parsed, all.filter((p) => p.handle !== handle)) });
        files.push({ path: `products/${handle}.html`, content: null });
        const sm = await readText(c, "sitemap.xml");
        if (sm) files.push({ path: "sitemap.xml", content: sitemapRemove(sm, handle) });
        message = `Delete product: ${existing.title.slice(0, 60)} (via dashboard)`;
      } else {
        throw new Bad("Unknown action");
      }

      try {
        const commit = await commitFiles(c, files, message);
        return sendJson(res, 200, { ok: true, product: result, commit: commit.url });
      } catch (e) {
        if (attempt === 1) throw e;
      }
    }
    return sendJson(res, 500, { error: "Could not publish" });
  } catch (e) {
    if (e instanceof Bad) return sendJson(res, 400, { error: e.message });
    return sendJson(res, 500, { error: e instanceof Error ? e.message : "Server error" });
  }
}
