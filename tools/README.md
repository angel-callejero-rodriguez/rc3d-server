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

## Regras que a ferramenta cumpre

- Texturas reduzidas para 2048 px no máximo e geometria em Draco. A forma e a escala não mudam.
- Para marcas com 3D, os números "antes/depois" são medidos nos ficheiros, não inventados.
- Mede as medidas do modelo (L × P × A). **Confirma-as com a página do produto antes de enviar.**
- Ids e tokens são aleatórios; nada fica listado publicamente.
