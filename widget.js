// RC3D widget: cole no site do cliente
//   <script src="https://ar.realityconcept3d.com/widget.js" defer></script>
// e depois use um destes:
//   <button class="rc3d-btn" data-model="mesa">Ver em 3D</button>     -> abre um pop-up
//   <div data-rc3d-embed="mesa" style="height:500px"></div>           -> visualizador na página
(function() {
    if (window.__rc3dWidget) return; // Evita carregar duas vezes
    window.__rc3dWidget = true;

    // O servidor é o mesmo de onde este script foi carregado (funciona também em testes locais)
    const script = document.currentScript;
    const SERVIDOR = script && script.src ? new URL(script.src).origin : 'https://ar.realityconcept3d.com';
    const PERMISSOES = 'xr-spatial-tracking; camera; autoplay; fullscreen';

    function urlDoModelo(nomeDoModelo) {
        const url = new URL('/', SERVIDOR);
        url.searchParams.set('modelo', nomeDoModelo);
        url.searchParams.set('qr', window.location.href); // O QR do PC aponta para esta página, se for nossa
        return url.toString();
    }

    function criarIframe(nomeDoModelo, titulo) {
        const iframe = document.createElement('iframe');
        iframe.src = urlDoModelo(nomeDoModelo);
        iframe.allow = PERMISSOES; // As permissões vitais para o AR!
        iframe.title = titulo || 'Visualizador 3D';
        iframe.loading = 'lazy';
        return iframe;
    }

    // 1. Pop-up (botões .rc3d-btn)
    function abrirModal(nomeDoModelo, botao) {
        const overflowAnterior = document.body.style.overflow;
        document.body.style.overflow = 'hidden'; // Trava o scroll da página por trás

        const modal = document.createElement('div');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Visualizador 3D');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: rgba(0, 0, 0, 0.85);
            z-index: 999999; display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(5px); opacity: 0; transition: opacity 0.3s ease;
        `;

        const iframe = criarIframe(nomeDoModelo, botao.getAttribute('aria-label') || botao.textContent.trim());
        iframe.loading = 'eager';
        iframe.style.cssText = `
            width: 95%; max-width: 1000px; height: 85vh;
            border: none; border-radius: 12px; background-color: #eeeeee;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        `;

        const btnFechar = document.createElement('button');
        btnFechar.type = 'button';
        btnFechar.setAttribute('aria-label', 'Fechar visualizador');
        btnFechar.innerHTML = '✕';
        btnFechar.style.cssText = `
            position: absolute; top: 20px; right: 20px;
            background: rgba(255, 255, 255, 0.2); border: none; color: white;
            font-size: 24px; font-weight: bold; width: 50px; height: 50px;
            border-radius: 50%; cursor: pointer; display: flex;
            align-items: center; justify-content: center; transition: 0.2s;
        `;
        btnFechar.onmouseenter = () => btnFechar.style.background = 'rgba(255, 255, 255, 0.4)';
        btnFechar.onmouseleave = () => btnFechar.style.background = 'rgba(255, 255, 255, 0.2)';

        let fechado = false;
        function fechar() {
            if (fechado) return;
            fechado = true;
            document.removeEventListener('keydown', aoTeclar);
            document.body.style.overflow = overflowAnterior;
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 300);
            if (botao.isConnected) botao.focus({ preventScroll: true }); // Devolve o foco ao botão
        }
        function aoTeclar(evento) {
            if (evento.key === 'Escape') fechar();
        }

        btnFechar.onclick = fechar;
        modal.addEventListener('click', (evento) => {
            if (evento.target === modal) fechar(); // Clique no fundo escuro fecha
        });
        document.addEventListener('keydown', aoTeclar);

        modal.appendChild(iframe);
        modal.appendChild(btnFechar);
        document.body.appendChild(modal);

        requestAnimationFrame(() => modal.style.opacity = '1'); // Animação de entrada
        btnFechar.focus({ preventScroll: true });
    }

    // 2. Visualizador dentro da página (elementos com data-rc3d-embed)
    function montarEmbeds() {
        document.querySelectorAll('[data-rc3d-embed]:not([data-rc3d-ready])').forEach((caixa) => {
            const nomeDoModelo = caixa.getAttribute('data-rc3d-embed');
            if (!nomeDoModelo) return;
            caixa.setAttribute('data-rc3d-ready', '');
            if (!caixa.style.height) caixa.style.height = '480px';
            const iframe = criarIframe(nomeDoModelo, caixa.getAttribute('aria-label'));
            iframe.style.cssText = 'width: 100%; height: 100%; border: none; border-radius: 12px; background-color: #eeeeee;';
            caixa.appendChild(iframe);
        });
    }

    function inicializarWidgetRC3D() {
        // Escuta os cliques em qualquer parte do site do cliente (funciona com botões adicionados depois)
        document.addEventListener('click', function(evento) {
            const botao = evento.target.closest && evento.target.closest('.rc3d-btn');
            if (!botao) return; // Se não for nosso, ignora e o site continua normal

            const nomeDoModelo = botao.getAttribute('data-model');
            if (!nomeDoModelo) return;

            evento.preventDefault(); // Impede que o botão recarregue a página
            abrirModal(nomeDoModelo, botao);
        });

        montarEmbeds();
    }

    // Disponível para sites que criam conteúdo depois (ex.: React): window.RC3D.montar()
    window.RC3D = { montar: montarEmbeds };

    // Garante que o script carrega em segurança seja em que plataforma for
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarWidgetRC3D);
    } else {
        inicializarWidgetRC3D();
    }
})();
