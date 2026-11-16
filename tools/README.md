# rc3d tools (local, não publicado)

Da lista de leads ao rascunho na Zoho:

```
leads.csv (marca, email, peça, ficheiro .glb)
   │  node rc3d.mjs demos leads.csv
   ▼
otimiza o .glb  →  m/<id>.glb + m/<id>.json   (modelo privado)
cria a demo     →  d/<token>.json             (página realityconcept3d.com/demo/<token>)
escreve o email →  out/<marca>-<token>.html   (pré-visualização)
   │  commit + push do servidor (git push server server-main:main)
   │  node rc3d.mjs check leads.csv      → confirma que está online
   │  node rc3d.mjs drafts leads.csv     → cria rascunho na Zoho
   ▼
abres a Zoho, revês, carregas em Enviar
```

Nada é enviado automaticamente. O `drafts` só cria rascunhos, e só para demos que já respondem online.

## Colunas da lista

| coluna | preenches tu | para quê |
|---|---|---|
| `nome_contacto` | sim | "Olá Maria," |
| `email` | sim | destinatário |
| `peca` | sim | nome da peça (ex.: "Lilly Armchair") |
| `ficheiro_glb` | sim | nome do ficheiro em Transferências (ex.: `lilly.glb`) ou caminho completo |
| `frase_email` | opcional | frase personalizada para marcas sem 3D |
| `tem 3D no site` | já está | `SIM...` = email de otimização com antes/depois |
| `demo_link`, `modelo_id`, `estado`, `data_contacto` | não | a ferramenta preenche |

Uma linha só é processada quando tem `ficheiro_glb`, `email` e `peca`, e ainda não tem `demo_link`.

## Ligar a Zoho (uma vez, ~5 minutos)

1. Abre https://api-console.zoho.eu → **Add Client** → **Self Client** → **Create**.
2. Copia `tools/.env.example` para `tools/.env` e abre-o no Bloco de Notas.
3. Cola o **Client ID** e o **Client Secret** em `ZOHO_CLIENT_ID` e `ZOHO_CLIENT_SECRET`.
4. No separador **Generate Code**:
   - Scope: `ZohoMail.messages.CREATE,ZohoMail.accounts.READ`
   - Time Duration: 10 minutes
   - Scope Description: `rc3d rascunhos`
   - **Create**, copia o código para `ZOHO_GRANT_CODE`. Guarda o ficheiro.
5. Em menos de 10 minutos, dentro de `tools/`:
   ```bash
   node rc3d.mjs zoho-setup
   ```
   Troca o código por um token permanente e guarda-o no `.env`. O `.env` não vai para o git.

## GIF da peça na página da loja (para o email)

Grava a página real do produto com um botão "Ver em 3D": o cursor clica, a foto passa a ser o modelo 3D e a peça roda 360°. O site da loja não é alterado; tudo acontece num browser local. Sai um GIF de ~1 MB, 720 px de largura, em loop.

Uma vez, dentro de `tools/`: `npm install` e `npx playwright install chromium`.

Para cada loja, dentro de `tools/`:

1. `node gif/peek.mjs <url-do-produto>`: screenshot em `out/gif/peek.png` e lista das imagens grandes com os seletores à volta. Escolhe o `target`, a caixa da foto principal.
2. Cria `gif/lojas/<loja>.json`. Copia um dos que já lá estão:
   - `url`: página do produto.
   - `glb`: modelo, relativo à raiz do rc3d-server (`m/<id>.glb`).
   - `target`: seletor CSS da caixa da foto principal.
   - `bg`: fundo do visualizador. Claro e neutro, mesmo em sites escuros.
   - `btnPos`: `top` ou `bottom`. Usa `top` se a foto passar do fundo do ecrã.
   - `scroll`: píxeis a descer depois do clique, para ver a peça inteira.
   - `t0` e `phi`: ângulo inicial e altura da câmara.
3. `node gif/angles.mjs gif/lojas/<loja>.json`: a foto da loja ao lado de 6 ângulos do modelo. Põe em `t0` o ângulo mais parecido com a foto.
4. `node gif/record.mjs gif/lojas/<loja>.json`: cria `out/gif/<loja>.gif` e `<loja>-folha.png`, com 4 momentos para rever.

No email, carrega o GIF com `uploadInline()` do `zoho.mjs` e põe `<img src="${img.url}">` no HTML, com um link para a demo. Diz no email que é uma simulação. As cores usam `tone-mapping="aces"` com exposição .8, o mais fiel às fotos das lojas.

## Regras que a ferramenta cumpre

- Modelos com menos de 9 MB ficam como estão: não se sacrifica qualidade.
- Acima de 9 MB: texturas reduzidas para 2048 px no máximo e geometria em Draco. A forma e a escala não mudam.
- Para marcas com 3D, os números "antes/depois" são medidos nos ficheiros, não inventados.
- Mede as medidas do modelo (L × P × A). **Confirma-as com a página do produto antes de enviar.**
- Ids e tokens são aleatórios; nada fica listado publicamente.
