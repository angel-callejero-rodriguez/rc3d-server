// Texto dos emails. Versões:
//  - a marca já tem 3D e mandamos o modelo dela otimizado: números antes/depois
//  - demo com a peça da marca: "seriam das primeiras em Portugal"
//  - demo com um modelo de exemplo (modelo_exemplo=sim): dizemos claramente que não é a peça deles
//  - sem demo (sem_demo=sim): proposta para usarem os modelos 3D que já têm
// encaminhar_para: o email vai para um endereço geral e pede para chegar a essa pessoa.

const SIGNATURE = `Obrigado,<br>Angel Rodriguez<br>Reality Concept 3D · <a href="https://realityconcept3d.com">realityconcept3d.com</a>`;
const OPT_OUT = `<p style="color:#888;font-size:12px">Se preferir não receber mais emails meus, basta dizer.</p>`;
const SITE_LIVE = "https://realityconcept3d.com/#modelos";

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const firstName = (name) => (name || "").trim().split(/\s+/)[0] || "";
const yes = (v) => /^s(im)?$/i.test((v || "").trim());

export function buildEmail({ lead, link, before, after, dims }) {
  const nome = lead.encaminhar_para ? "" : firstName(lead.nome_contacto);
  const ola = nome ? `Olá ${escape(nome)},` : "Olá,";
  const peca = escape(lead.peca);
  const marca = escape(lead.marca);
  // Frase pronta para o email (coluna frase_email); o "gancho" da lista é só uma nota interna.
  const gancho = (lead.frase_email || "").trim().replace(/\.$/, "");
  const intro = `<p>${ola}</p><p>Chamo-me Angel e trabalho com 3D e realidade aumentada para marcas de mobiliário (Reality Concept 3D).</p>`;
  const linkBlock = `<p>Pode ver aqui, no telemóvel (é uma página privada, só para vós):<br><strong><a href="${link}">${link}</a></strong></p>`;
  const ask = lead.encaminhar_para
    ? `<p>Gostava de falar sobre isto com o ${escape(lead.encaminhar_para)}. Agradecia muito que lhe encaminhassem este email, e fico à disposição para uma chamada de 15 minutos.</p>`
    : `<p>Tem 15 minutos esta semana para uma chamada?</p>`;
  const end = `${ask}<p>${SIGNATURE}</p>${OPT_OUT}`;

  if (yes(lead.sem_demo)) {
    return {
      subject: `Os modelos 3D da ${lead.marca}, no vosso site e em AR`,
      html: `${intro}
<p>Vi que a ${marca} já trabalha com ficheiros 3D das vossas peças. ${gancho ? `${escape(gancho)}.` : ""}</p>
<p>Com esses mesmos modelos, o cliente pode rodar cada peça no vosso site e, no telemóvel, vê-la no chão da sala dele, no tamanho real. Funciona com uma linha de código, sem apps nem plugins, e nós tratamos de preparar os ficheiros para a web.</p>
<p>Pode experimentar como funciona aqui, no telemóvel: <a href="${SITE_LIVE}">${SITE_LIVE}</a></p>
${end}`,
    };
  }

  if (before) {
    return {
      subject: `A vossa ${lead.peca}, mais leve e no tamanho real em AR`,
      html: `${intro}
<p>Reparei que a ${marca} já tem 3D no site, o que é raro numa marca portuguesa.</p>
<p>Peguei no modelo da ${peca} que já está no vosso site e preparei uma versão otimizada, sem mexer na forma nem nos materiais:</p>
<ul>
<li>o ficheiro passa de <strong>${before.sizeMb} MB para ${after.sizeMb} MB</strong>;</li>
<li>gasta <strong>${before.gpuMb} MB → ${after.gpuMb} MB</strong> de memória gráfica no telemóvel;</li>
<li>em AR aparece <strong>sempre no tamanho real</strong>${dims ? ` (${dims})` : ""} e não pode ser esticada.</li>
</ul>
${linkBlock}
<p>Posso fazer o mesmo às restantes peças e modelar as que ainda não têm 3D.</p>
${end}`,
    };
  }

  const hook = `<p>Vi as vossas peças e quase nenhuma marca portuguesa mostra os móveis em 3D e no tamanho real, na sala do cliente.${gancho ? ` ${escape(gancho)}.` : ""}</p>`;

  if (yes(lead.modelo_exemplo)) {
    return {
      subject: `A ${lead.marca} em 3D e na sala do cliente`,
      html: `${intro}
${hook}
<p>Para mostrar como funcionaria, preparei uma demonstração com uma poltrona semelhante à vossa ${peca}. Não é a vossa peça, é um modelo de exemplo: o cliente roda-a no site e, no telemóvel, vê-a no chão da sala dele, no tamanho real.</p>
${linkBlock}
<p>Com a vossa ${peca} ficaria exatamente assim, e funciona no vosso site com uma linha de código, sem apps nem plugins.</p>
${end}`,
    };
  }

  return {
    subject: `A ${lead.peca} da ${lead.marca} em 3D e na sala do cliente`,
    html: `${intro}
${hook}
<p>Preparei a ${peca} assim: o cliente roda a peça no site e, no telemóvel, vê-a no chão da sala dele${dims ? `, no tamanho real (${dims})` : ", no tamanho real"}.</p>
${linkBlock}
<p>Funciona no vosso site com uma linha de código, sem apps nem plugins.</p>
${end}`,
  };
}
