# Inventari del cau

Una web privada amb el mapa de l'emmagatzematge del cau. Viu al vostre domini,
a Cloudflare, dins del pla gratuït. No depèn de cap altra plataforma.

## Què fa

- Plànol clicable: sala → moble → safata → objectes
- Cerca: escrius "corda" i et diu a quina safata és
- Afegir i treure objectes des de la mateixa web, sense fitxers ni programes
- Dues contrasenyes: una per mirar, una altra per editar
- Descàrrega en Excel quan la necessiteu
- Historial automàtic: cada cop que algú desa, es guarda com estava abans

## Muntar-ho (un cop)

Cal `npm` i el compte de Cloudflare on ja teniu el domini.

**1. Posa aquests fitxers al repositori.** Poden anar a una carpeta seva
(`inventari/`) dins del repo de la web, o en un repositori nou. Recomano un de
nou: així no hi ha manera que això trenqui la web de l'agrupament.

**2. Crea l'espai on es guarden les dades.**

```bash
npx wrangler kv namespace create INVENTARI
```

Copia l'`id` que et diu i posa'l a `wrangler.jsonc`, on ara hi diu
`AQUI_VA_L_ID_DEL_KV`.

**3. Publica.**

```bash
npx wrangler deploy
```

**4. Posa les contrasenyes.**

```bash
npx wrangler secret put CLAU_LECTURA
npx wrangler secret put CLAU_EDICIO
```

Te les demanarà una per una. La primera és la que passeu a tot el grup; la
segona, només als 2 o 3 que mantenen l'inventari. Es poden canviar quan vulgueu
repetint la mateixa ordre, o des del tauler de Cloudflare a
*Workers > inventari-cau > Settings > Variables*.

> Canviar una contrasenya tanca la sessió de tothom. És el que vols quan algú
> plega del grup.

**5. Posa-li el subdomini.**

Al tauler de Cloudflare: *Workers > inventari-cau > Settings > Domains & Routes
> Add > Custom domain*, i escriu `inventari.elvostredomini.cat`. Com que el
domini ja és a Cloudflare, el DNS es configura sol en un parell de minuts.

I ja està. Passa l'enllaç i la contrasenya de lectura al grup.

## Per als que editen

Entren amb la contrasenya d'edició i ja els surten els botons d'afegir i treure.
**No cal desar res**: cada canvi es guarda sol i surt un "Desat" a dalt a la
dreta. No hi ha fitxers, ni descàrregues, ni res per pujar enlloc.

Si dues persones editen alhora, la segona rep un avís i se li demana que
recarregui, en comptes d'esborrar la feina de la primera.

El botó *Historial* mostra com estava l'inventari abans de cada canvi, amb un
botó per recuperar-ho. Serveix per a quan algú esborra el que no tocava.

## Canvis que faràs tu

**Les safates d'un moble.** Ara mateix l'armari llops està com a 3 files × 4
columnes. Si a la realitat són 4 safates de 3, canvia-ho a `src/index.js`, a la
llista `LLAVOR` de baix de tot, i torna a fer `npx wrangler deploy`.

> Compte: `LLAVOR` només s'aplica el primer cop, quan encara no hi ha dades. Un
> cop hàgiu començat a apuntar coses, canviar-la no fa res. Si necessites
> reorganitzar mobles quan ja hi hagi inventari, digue-m'ho i t'afegeixo els
> botons per fer-ho des de la web.

**Moure coses al plànol o afegir un moble nou a una sala.** Les coordenades són
a `public/index.html`, a les taules `SALES` i `MOBLES` de dalt de tot. Estan
tretes a ull del teu esquema, o sigui que segurament caldrà ajustar-ne alguna
quan ho vegis en pantalla.

## Cost

Zero. Les visites i les escriptures que farà un inventari que es toca dos cops
l'any queden molt per sota del pla gratuït de Cloudflare.

## Si alguna cosa falla

**"No s'ha pogut connectar"** — el Worker no troba el KV. Comprova que l'`id` de
`wrangler.jsonc` és el bo i que l'enllaç es diu exactament `INVENTARI`.

**La contrasenya bona no entra** — probablement el secret no s'ha guardat.
Repeteix el `wrangler secret put`.

**Canvies el codi i no es nota** — cal tornar a fer `npx wrangler deploy`.
