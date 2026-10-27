// Texto dos emails. Duas versões:
//  - a marca já tem 3D: "otimizei o vosso modelo" + números antes/depois
//  - a marca não tem 3D: "seriam das primeiras em Portugal" + gancho da lista

const SIGNATURE = `Obrigado,<br>Angel Rodriguez<br>Reality Concept 3D · <a href="https://realityconcept3d.com">realityconcept3d.com</a>`;
const OPT_OUT = `<p style="color:#888;font-size:12px">Se preferir não receber mais emails meus, basta dizer.</p>`;

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const firstName = (name) => (name || "").trim().split(/\s+/)[0] || "";

export function buildEmail({ lead, link, before, after, dims }) {
  const nome = firstName(lead.nome_contacto);
  const ola = nome ? `Olá ${escape(nome)},` : "Olá,";
  const peca = escape(lead.peca);
  const marca = escape(lead.marca);
  // Frase pronta para o email (coluna frase_email); o "gancho" da lista é só uma nota interna.
  const gancho = (lead.frase_email || "").trim().replace(/\.$/, "");
  const intro = `<p>${ola}</p><p>Chamo-me Angel e trabalho com 3D e realidade aumentada para marcas de mobiliário (Reality Concept 3D).</p>`;
  const linkBlock = `<p>Pode ver aqui, no telemóvel (é uma página privada, só para vós):<br><strong><a href="${link}">${link}</a></strong></p>`;
  const ask = `<p>Tem 15 minutos esta semana para uma chamada?</p>`;

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
${ask}<p>${SIGNATURE}</p>${OPT_OUT}`,
    };
  }

  return {
    subject: `A ${lead.peca} da ${lead.marca} em 3D e na sala do cliente`,
    html: `${intro}
<p>Vi as vossas peças e quase nenhuma marca portuguesa mostra os móveis em 3D e no tamanho real, na sala do cliente.${gancho ? ` ${escape(gancho)}.` : ""}</p>
<p>Preparei a ${peca} assim: o cliente roda a peça no site e, no telemóvel, vê-a no chão da sala dele${dims ? `, no tamanho real (${dims})` : ", no tamanho real"}.</p>
${linkBlock}
<p>Funciona no vosso site com uma linha de código, sem apps nem plugins.</p>
${ask}<p>${SIGNATURE}</p>${OPT_OUT}`,
  };
}
