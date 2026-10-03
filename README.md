# Inventari del cau

Una web privada amb el mapa de l'emmagatzematge del cau. Viu al vostre domini,
a Cloudflare, dins del pla gratuït. No depèn de cap altra plataforma.

## Què fa

- Plànol clicable: sala → moble → safata → objectes, o la mateixa informació
  en llista desplegable amb caselles per seleccionar i exportar
- Cada sala té el seu color: Pioners lila, Raiers blau, Llops verd, Follets
  taronja. En entrar-hi, tota l'aplicació s'hi tenyeix, o sigui que sempre saps
  on ets sense llegir res
- Cada moble es dibuixa amb la seva forma real i s'adapta a la pantalla
- Cerca: escrius "corda" i et diu a quina safata és
- Afegir, editar, moure i treure objectes des de la mateixa web
- Foto per objecte, feta amb el mòbil des del mateix formulari
- Tasques amb data i repetició ("renovar les vendes cada 8 mesos")
- Préstecs: qui s'ha endut què i quan ho ha de tornar
- Mode revisió: recorres un moble marcant què hi és i què falta
- "Veure-ho tot": llista alfabètica de tot el que hi ha en una sala
- Gestionar els mobles des de la web: nom, compartiments, afegir-ne i treure'n
- Dues contrasenyes: una per mirar, una altra per editar
- Descàrrega en Excel quan la necessiteu
- Etiquetes (acampada, cuina, primers auxilis) per agrupar coses que no són al
  mateix lloc
- Llistes desades: el que us endueu a un campament, triat un cop i reutilitzat
  cada any, amb exportació a Excel
- Manual d'ús dins de la mateixa aplicació
- Historial automàtic: cada cop que algú desa, es guarda com estava abans

## Com es navega

La barra de baix té **Mapa**, **Llistes**, **Pendents** (només a mòbil) i
**Més**. A ordinador, Pendents deixa de ser un botó i passa a ser una columna
fixa a la dreta, sempre a la vista.

La cerca viu a la pàgina, no a la barra: escrivint-hi surt un desplegable amb
els noms que encaixen — objectes, mobles i sales — i la resta de la pàgina es
queda on és.

A dalt a la dreta hi ha el botó que canvia entre **mapa** i **llista**. La
llista mostra el que hi ha allà on ets: dins d'una sala, aquella sala; a la
vista general, tot. Cada secció es desplega i cada element té una casella per
triar què vols descarregar en Excel.

El **?** de la capçalera obre el manual, que també és el primer que surt dins
de *Més*. El botó rodó de la cantonada afegeix un objecte allà on ets.

El botó d'enrere del navegador, el lateral del ratolí i el gest del mòbil fan
el mateix que la fletxa de la interfície: tornen a la vista anterior o tanquen
el panell obert, i no surten de l'aplicació. Les accions pròpies del lloc on ets — revisar, gestionar els
mobles, canviar les safates — surten com a botons petits sota la capçalera, i
les coses de tant en tant (Excel, historial, sortir) viuen dins de *Més*.

A dalt a l'esquerra hi ha sempre el botó d'enrere, que diu on et porta. El botó
enrere del mòbil i el gest de lliscar també funcionen, i l'adreça guarda on ets:
pots desar o compartir un enllaç que obri directament un moble concret.

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

La sessió dura **2 dies**; després torna a demanar la contrasenya. Està a
`DIES_SESSIO`, a dalt de `src/index.js`. Per passar de mode editor a mode
consulta sense esperar, *Més > Surt* i torna a entrar amb l'altra.

**5. Posa-li el subdomini.**

Al tauler de Cloudflare: *Workers > inventari-cau > Settings > Domains & Routes
> Add > Custom domain*, i escriu `inventari.elvostredomini.cat`. Com que el
domini ja és a Cloudflare, el DNS es configura sol en un parell de minuts.

I ja està. Passa l'enllaç i la contrasenya de lectura al grup.

## Llistes

Una llista és un grapat d'objectes triats de l'inventari. El constructor té dues
bandes: a l'esquerra tot el que hi ha al cau, a la dreta el que has triat, i
tocant un objecte passa d'una banda a l'altra. Les dues bandes s'ordenen igual,
per sala i moble, per nom o per etiqueta.

Filtrant per etiqueta i fent *Afegeix-ho tot* es munta una llista sencera amb
dos tocs. **Marca-ho com a tret del cau** apunta qui se'ls endú i marca tots els
objectes de la llista com a fora d'una tacada; **Ha tornat tot** els allibera i
els marca com a comprovats.

Les llistes queden desades i es poden reobrir, duplicar, buidar o esborrar.

## L'Excel

El fitxer porta tres fulls: la taula, un **Resum** amb els recomptes per sala,
per moble i per etiqueta, i l'inventari sencer. Totes les columnes porten
filtre, o sigui que es reordena des de la fletxa de cada capçalera.

No és una taula dinàmica de debò: la llibreria que genera l'Excel des del
navegador no en sap fer, ni tampoc immobilitzar la capçalera. Si en voleu una,
seleccioneu una cel·la de la taula i feu *Insereix > Taula dinàmica*; l'Excel ja
n'agafa el rang.

## Per als que editen

Entren amb la contrasenya d'edició i ja els surten els botons d'afegir i treure.
**No cal desar res**: cada canvi es guarda sol i surt un "Desat" a dalt a la
dreta. No hi ha fitxers, ni descàrregues, ni res per pujar enlloc.

Si dues persones editen alhora, la segona rep un avís i se li demana que
recarregui, en comptes d'esborrar la feina de la primera.

El botó *Historial* mostra com estava l'inventari abans de cada canvi, amb un
botó per recuperar-ho. Serveix per a quan algú esborra el que no tocava.

## Canvis que faràs tu

**Les safates d'un moble.** Ja no cal tocar codi: obre el moble i clica
*Canvia les safates*, o ves a la sala i clica *Gestiona els mobles*. Si en
redueixes, el que hi hagi a les caselles que desapareguin es mou a l'última que
queda, i t'avisa abans de fer-ho.

La llista `LLAVOR` de `src/index.js` només s'aplica el primer cop, quan encara
no hi ha dades. Un cop hi ha inventari, no serveix de res tocar-la.

**Moure coses al plànol o afegir un moble nou a una sala.** Les coordenades són
a `public/index.html`, a les taules `SALES` i `MOBLES` de dalt de tot. Estan
tretes a ull del teu esquema, o sigui que segurament caldrà ajustar-ne alguna
quan ho vegis en pantalla.

## Les fotos

Es fan servir des del formulari de l'objecte. Al mòbil obre directament la
càmera. La imatge s'encongeix al navegador abans de pujar-se (900 px de costat
màxim), o sigui que cada foto ocupa unes poques desenes de kB.

Es guarden al mateix KV que la resta. Cabrien milers de fotos dins del pla
gratuït, però si un dia l'espai s'omple, el lloc on mirar és aquest.

## Cost

Zero. Les visites i les escriptures que farà un inventari que es toca dos cops
l'any queden molt per sota del pla gratuït de Cloudflare.

## Si alguna cosa falla

**"No s'ha pogut connectar"** — el Worker no troba el KV. Comprova que l'`id` de
`wrangler.jsonc` és el bo i que l'enllaç es diu exactament `INVENTARI`.

**La contrasenya bona no entra** — probablement el secret no s'ha guardat.
Repeteix el `wrangler secret put`.

**Canvies el codi i no es nota** — cal tornar a fer `npx wrangler deploy`.
