# rc3d-server

> 🇵🇹 O servidor 3D/AR da Reality Concept 3D. A documentação de operação, em português, começa em [Como funciona](#como-funciona).

**Live:** [ar.realityconcept3d.com](https://ar.realityconcept3d.com/?modelo=atelier). Open it on a phone and tap the AR button to place the chair in your room.

rc3d-server is the 3D and augmented reality (AR) backend of [Reality Concept 3D](https://www.realityconcept3d.com), a startup from Porto that brings furniture stores' products into 3D and AR. Any store website (WooCommerce, Shopify, Squarespace or hand-made) gets a 3D viewer and AR by pasting **one line of code**:

```html
<script src="https://ar.realityconcept3d.com/widget.js" defer></script>
<button class="rc3d-btn" data-model="atelier">View in 3D</button>
```

## Highlights

- **No database, no backend to run.** The model registry is JSON files in Git. A push deploys on Vercel, and tests run before every deploy. If they fail, nothing ships.
- **Safe by design.** The viewer only loads registered model ids, never an arbitrary URL. The QR endpoint only encodes `https` links to our own domains, so it can't be used as a free QR generator.
- **AR at real size.** Google model-viewer opens WebXR, Android Scene Viewer or iPhone Quick Look with `ar-scale="fixed"`. Furniture can't be stretched.
- **Private store models.** Each store's models get unguessable random ids and are left out of every public list.
- **Model pipeline (`tools/`).** A Node CLI takes a store's `.glb`:
  - removes stray ground planes;
  - keeps files under 9 MB at full quality and compresses larger ones (2048 px textures, Draco geometry);
  - measures the real dimensions to check against the product page;
  - creates the store's demo page;
  - prepares an email draft through the Zoho Mail API. Drafts are never sent automatically.

## Tech stack

- Vanilla JavaScript (ES modules), no framework
- Google model-viewer 3.4
- Vercel static hosting and one serverless function (`api/qr.js`, QR codes as SVG)
- Node's built-in test runner (`node --test`)
- glTF Transform for model optimisation

## Run it

```bash
npm install
npm test          # tests
npm run build     # tests + dist/ (only the public files)
```

---

## Como funciona

```
 SITE DA LOJA                                  rc3d-server (ar.realityconcept3d.com)
 ───────────                                   ──────────────────────────────────────
 <script src=".../widget.js">  ──carrega──▶    widget.js
 <button class="rc3d-btn"                        cria uma <iframe> para /?modelo=<id>
         data-model="mesa">                              │
                                                         ▼
                                               index.html (o visualizador)
                                                 1. lê ?modelo=<id>
                                                 2. resolve.js procura o id:
                                                      /models.json      (modelos públicos)
                                                      /m/<id>.json      (modelos privados)
                                                 3. encontrou e está ativo?
                                                      sim → <model-viewer> com o .glb, AR, crédito
                                                      não → "Serviço Indisponível"
                                                 4. no PC: botão QR → /api/qr (função nossa)
```

- **Não há base de dados.** O "registo" são ficheiros JSON neste repo. Para adicionar um modelo faz-se commit e push; a Vercel publica.
- **Só modelos registados aparecem.** O visualizador nunca carrega um link qualquer: `?modelo=https://outro-site/x.glb` mostra o erro.
- **Links antigos continuam a funcionar:** `?modelo=mesa.glb` é igual a `?modelo=mesa`.
- **AR:** o `<model-viewer>` da Google abre WebXR, Scene Viewer (Android) ou Quick Look (iPhone). `ar-scale="fixed"`: o móvel aparece no tamanho real e não pode ser esticado.
- **QR:** gerado por `api/qr.js` no nosso servidor. Só aceita links `https` de realityconcept3d.com, por isso ninguém o usa como gerador de QR grátis e nenhum link privado vai para terceiros.

## Ficheiros

| Ficheiro | O que faz |
|---|---|
| `widget.js` | O que os clientes colam no site. Cria o pop-up ou o visualizador na página. |
| `index.html` | O visualizador 3D/AR que aparece dentro da iframe. |
| `resolve.js` | A regra "que id dá que modelo". Usado pelo visualizador e pelos testes. |
| `models.json` | Modelos públicos (demonstrações do site). |
| `m/<id>.json` + `m/<id>.glb` | Modelos privados (peças das lojas). Não aparecem em nenhuma lista. |
| `d/<token>.json` | Demos das lojas, lidas pelas páginas `/demo/<token>` do site. |
| `tools/` | Ferramentas locais: do `.glb` da loja até à demo e ao rascunho de email (ver `tools/README.md`). |
| `api/qr.js` | Função da Vercel que desenha o QR em SVG. |
| `scripts/build.mjs` | Copia para `dist/` só o que deve ser público. |
| `test/resolve.test.mjs` | Testes (`npm test`). Correm em cada deploy: se falharem, o deploy não acontece. |
| `vercel.json` | Comando de build, pasta `dist/`, cabeçalhos (CORS nos .glb, `noindex`). |

## Colar num site (o que se envia à loja)

```html
<script src="https://ar.realityconcept3d.com/widget.js" defer></script>

<!-- Botão que abre um pop-up -->
<button class="rc3d-btn" data-model="mesa">Ver em 3D</button>

<!-- Ou o visualizador dentro da página -->
<div data-rc3d-embed="mesa" style="height:500px"></div>
```

O pop-up fecha com o X, a tecla Escape ou um clique no fundo escuro. Em sites que criam conteúdo depois de carregar (React, etc.), chamar `window.RC3D.montar()` depois de adicionar um `data-rc3d-embed`.

## Adicionar um modelo público (demonstração)

1. Copiar o `.glb` para a raiz (nome em minúsculas, sem espaços): `poltrona.glb`.
2. Adicionar a `models.json`:
   ```json
   "poltrona": { "src": "/poltrona.glb", "name": "Poltrona", "credit": "Autor, licença" }
   ```
3. `npm test`, commit, push.

## Adicionar o modelo privado de uma loja

1. Gerar um id impossível de adivinhar:
   ```bash
   node -e "console.log(require('crypto').randomBytes(8).toString('hex'))"
   ```
   Exemplo: `9f3c2a7d1e8b4c6a`.
2. Guardar o modelo como `m/9f3c2a7d1e8b4c6a.glb` e criar `m/9f3c2a7d1e8b4c6a.json`:
   ```json
   { "src": "/m/9f3c2a7d1e8b4c6a.glb", "name": "Mesa de centro", "credit": "Modelo Reality Concept para Stylish Club" }
   ```
3. `npm test`, commit, push. O modelo fica em `https://ar.realityconcept3d.com/?modelo=9f3c2a7d1e8b4c6a`.
4. Criar a demo da loja em `d/<token>.json` (o token é outro valor aleatório, é o que vai no email):
   ```json
   {"store":"Stylish Club","product":"Mesa de centro","model":"9f3c2a7d1e8b4c6a"}
   ```
   Commit e push. A demo fica em `https://realityconcept3d.com/demo/<token>`. Um token errado dá 404. A ferramenta `tools/rc3d.mjs` faz os passos 1 a 4 sozinha (ver `tools/README.md`).

**Atenção:** os ficheiros publicados não são secretos: quem tiver o id consegue abrir o modelo. A privacidade vem de ids aleatórios e de não haver nenhuma lista. Nunca pôr ids privados em `models.json`.

## Desativar um modelo

`"active": false` numa entrada esconde o modelo do visualizador e do widget. **O `.glb` continua acessível** a quem tiver o link direto. Para cortar mesmo (ex.: cliente deixou de pagar), apagar ou mudar o nome do ficheiro.

## Testar localmente

```bash
npm install
npm test          # testes
npm run build     # testes + dist/
```

## Ordem de deploy

Quando uma mudança toca nos dois repos: **primeiro este servidor**, verificar `https://ar.realityconcept3d.com/?modelo=mesa`, **depois o site**. O site depende dos ids que existem aqui.

## Checklist no telemóvel (antes de enviar uma demo)

Abrir a demo da loja no telemóvel e confirmar, em **Android e iPhone**:

- [ ] O modelo aparece e roda com o dedo.
- [ ] O botão de AR abre a câmara (Android: Scene Viewer; iPhone: Quick Look).
- [ ] No AR, o móvel tem o tamanho real (comparar com as medidas da página da loja) e não estica com dois dedos.
- [ ] Repetir dentro do pop-up (botão "Ver em ecrã inteiro") e dentro do visualizador na página.
- [ ] Se o AR não abrir dentro da iframe no iPhone: usar o link "Abrir em ecrã inteiro" (canto superior direito) e avisar para mudarmos o widget.
- [ ] No PC: o botão QR mostra um código que, lido pelo telemóvel, abre a mesma demo.

## Limites conhecidos

- Qualquer site pode embeber um modelo público (é o produto). Não há controlo por domínio nem pagamento automático.
- O visualizador usa model-viewer 3.4.0; o site principal usa 4.x.
- Escape só fecha o pop-up se o foco não estiver dentro do visualizador 3D (a iframe fica com as teclas).
