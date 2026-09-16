/**
 * Inventari del cau — Worker de Cloudflare
 *
 * Fa tres coses:
 *   1. Serveix la pàgina (public/index.html)
 *   2. Guarda i llegeix les dades a KV
 *   3. Comprova les contrasenyes i reparteix permisos
 *
 * Variables que s'han de configurar al tauler de Cloudflare:
 *   CLAU_LECTURA  — la contrasenya que passeu a tot el grup
 *   CLAU_EDICIO   — la dels 2 o 3 que mantenen l'inventari
 * Enllaç KV: INVENTARI
 */

const CLAU_DADES = 'inventari';
const MAX_COPIES = 25;
const DIES_SESSIO = 60;

export default {
  async fetch(peticio, env) {
    const url = new URL(peticio.url);
    if (url.pathname.startsWith('/api/')) return api(peticio, env, url);
    return env.ASSETS.fetch(peticio);
  }
};

/* ==================== encaminament ==================== */

async function api(peticio, env, url) {
  const ruta = url.pathname.slice(5);
  try {
    if (ruta === 'entrar' && peticio.method === 'POST') return await entrar(peticio, env);
    if (ruta === 'sortir' && peticio.method === 'POST') return sortir();

    const paper = await paperDe(peticio, env);
    if (!paper) return json({ error: 'cal_entrar' }, 401);

    if (ruta === 'jo') return json({ paper: paper });
    if (ruta === 'dades' && peticio.method === 'GET') return await llegir(env, paper);
    if (ruta === 'dades' && peticio.method === 'POST') {
      if (paper !== 'edicio') return json({ error: 'nomes_lectura' }, 403);
      return await desar(peticio, env);
    }
    if (ruta === 'copies' && peticio.method === 'GET') {
      if (paper !== 'edicio') return json({ error: 'nomes_lectura' }, 403);
      return await llistarCopies(env);
    }
    if (ruta === 'restaurar' && peticio.method === 'POST') {
      if (paper !== 'edicio') return json({ error: 'nomes_lectura' }, 403);
      return await restaurar(peticio, env);
    }
    return json({ error: 'no_existeix' }, 404);
  } catch (e) {
    return json({ error: 'error_intern', detall: String(e && e.message || e) }, 500);
  }
}

const json = (o, estat) => new Response(JSON.stringify(o), {
  status: estat || 200,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

/* ==================== sessions ==================== */

async function clauHmac(env) {
  const material = (env.CLAU_EDICIO || '') + '::' + (env.CLAU_LECTURA || '');
  return crypto.subtle.importKey('raw', new TextEncoder().encode(material),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function signar(text, env) {
  const f = await crypto.subtle.sign('HMAC', await clauHmac(env), new TextEncoder().encode(text));
  return [...new Uint8Array(f)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function entrar(peticio, env) {
  const cos = await peticio.json().catch(() => ({}));
  const clau = String(cos.clau || '');
  if (!clau) return json({ error: 'clau_buida' }, 400);

  let paper = null;
  if (env.CLAU_EDICIO && iguals(clau, env.CLAU_EDICIO)) paper = 'edicio';
  else if (env.CLAU_LECTURA && iguals(clau, env.CLAU_LECTURA)) paper = 'lectura';
  if (!paper) return json({ error: 'clau_incorrecta' }, 401);

  const caduca = Date.now() + DIES_SESSIO * 86400000;
  const carrega = paper + '.' + caduca;
  const galeta = carrega + '.' + await signar(carrega, env);

  return new Response(JSON.stringify({ paper: paper }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'set-cookie': 'sessio=' + galeta + '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=' + (DIES_SESSIO * 86400)
    }
  });
}

function sortir() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'set-cookie': 'sessio=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
    }
  });
}

async function paperDe(peticio, env) {
  const cru = peticio.headers.get('cookie') || '';
  const tros = cru.split(';').map(s => s.trim()).find(s => s.startsWith('sessio='));
  if (!tros) return null;
  const parts = tros.slice(7).split('.');
  if (parts.length !== 3) return null;
  const [paper, caduca, firma] = parts;
  if (paper !== 'lectura' && paper !== 'edicio') return null;
  if (!Number(caduca) || Number(caduca) < Date.now()) return null;
  if (!iguals(firma, await signar(paper + '.' + caduca, env))) return null;
  return paper;
}

/** Comparació de temps constant. */
function iguals(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/* ==================== dades ==================== */

async function llegir(env, paper) {
  let dades = await env.INVENTARI.get(CLAU_DADES, 'json');
  if (!dades) {
    dades = { actualitzat: new Date().toISOString(), files: LLAVOR };
    await env.INVENTARI.put(CLAU_DADES, JSON.stringify(dades));
  }
  return json({ paper: paper, actualitzat: dades.actualitzat, files: dades.files });
}

async function desar(peticio, env) {
  const cos = await peticio.json().catch(() => null);
  if (!cos || !Array.isArray(cos.files)) return json({ error: 'dades_invalides' }, 400);
  if (cos.files.length > 20000) return json({ error: 'massa_files' }, 413);

  // Si algú altre ha desat mentre aquesta persona editava, no li trepitgem la feina.
  const actual = await env.INVENTARI.get(CLAU_DADES, 'json');
  if (actual && cos.vist && actual.actualitzat && cos.vist !== actual.actualitzat) {
    return json({ error: 'algu_s_ha_avancat', actualitzat: actual.actualitzat }, 409);
  }

  if (actual) {
    await env.INVENTARI.put('copia:' + (actual.actualitzat || new Date().toISOString()),
      JSON.stringify(actual), { expirationTtl: 60 * 86400 });
    netejarCopies(env);
  }

  const noves = { actualitzat: new Date().toISOString(), files: cos.files.map(neteja) };
  await env.INVENTARI.put(CLAU_DADES, JSON.stringify(noves));
  return json({ ok: true, actualitzat: noves.actualitzat });
}

function neteja(f) {
  const t = v => String(v == null ? '' : v).slice(0, 500);
  return {
    id: t(f.id), tipus: t(f.tipus), pare: f.pare ? t(f.pare) : null,
    pos: t(f.pos), nom: t(f.nom),
    quantitat: f.quantitat == null || f.quantitat === '' ? null : Number(f.quantitat),
    notes: t(f.notes),
    files: Math.max(0, Math.min(40, Number(f.files) || 0)),
    columnes: Math.max(0, Math.min(40, Number(f.columnes) || 0)),
    actualitzat: t(f.actualitzat)
  };
}

async function netejarCopies(env) {
  const l = await env.INVENTARI.list({ prefix: 'copia:' });
  const claus = l.keys.map(k => k.name).sort();
  for (const k of claus.slice(0, Math.max(0, claus.length - MAX_COPIES))) {
    await env.INVENTARI.delete(k);
  }
}

async function llistarCopies(env) {
  const l = await env.INVENTARI.list({ prefix: 'copia:' });
  return json({ copies: l.keys.map(k => k.name.slice(6)).sort().reverse() });
}

async function restaurar(peticio, env) {
  const cos = await peticio.json().catch(() => ({}));
  const c = await env.INVENTARI.get('copia:' + String(cos.quan || ''), 'json');
  if (!c) return json({ error: 'copia_no_trobada' }, 404);
  const noves = { actualitzat: new Date().toISOString(), files: c.files };
  await env.INVENTARI.put(CLAU_DADES, JSON.stringify(noves));
  return json({ ok: true, actualitzat: noves.actualitzat });
}

/* ==================== estructura inicial ==================== */

const M = (id, pare, nom, files, columnes) => ({
  id, tipus: 'moble', pare, pos: '', nom, quantitat: null, notes: '',
  files, columnes, actualitzat: ''
});
const S = (id, nom) => ({
  id, tipus: 'sala', pare: null, pos: '', nom, quantitat: null, notes: '',
  files: 0, columnes: 0, actualitzat: ''
});

const LLAVOR = [
  S('pioners', 'Pioners'),
  S('raiers', 'Raiers'),
  S('llops', 'Llops'),
  S('follets', 'Follets'),
  M('armari', null, 'Armari', 3, 1),
  M('arxivador', 'pioners', 'Arxivador', 3, 1),
  M('armari_raiers', 'raiers', 'Armari raiers', 3, 3),
  M('armari_llops', 'llops', 'Armari llops', 3, 4),
  M('estanteria', 'llops', 'Estanteria', 3, 1),
  M('armari_documents', 'llops', 'Armari de documents', 3, 3),
  M('sala_llops', 'llops', 'Sala llops', 0, 0),
  M('armari_follets', 'follets', 'Armari follets', 3, 1),
  M('pica', 'follets', 'Pica', 0, 0),
  M('sala_follets', 'follets', 'Sala', 0, 0)
];
