(function() {
    function inicializarWidgetRC3D() {
        // Escuta os cliques em qualquer parte do site do cliente
        document.body.addEventListener('click', function(evento) {
            // Verifica se o clique foi num botão nosso (rc3d-btn)
            const botao = evento.target.closest('.rc3d-btn');
            if (!botao) return; // Se não for, ignora e o site continua normal

            evento.preventDefault(); // Impede que o botão recarregue a página
            
            // Vai buscar o nome do modelo (ex: 'atelier') ao botão
            const nomeDoFicheiro = botao.getAttribute('data-model');
            if (!nomeDoFicheiro) return;

            // 1. Cria a caixa do Modal
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background-color: rgba(0, 0, 0, 0.85);
                z-index: 999999; display: flex; align-items: center; justify-content: center;
                backdrop-filter: blur(5px); opacity: 0; transition: opacity 0.3s ease;
            `;

            // 2. A iFrame ligada ao teu servidor
            const iframe = document.createElement('iframe');
            iframe.src = `https://ar.realityconcept3d.com/?modelo=${nomeDoFicheiro}`;
            iframe.style.cssText = `
                width: 95%; max-width: 1000px; height: 85vh;
                border: none; border-radius: 12px; background-color: #eeeeee;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            `;
            // As permissões vitais!
            iframe.allow = "xr-spatial-tracking; camera; autoplay; fullscreen";

            // 3. O Botão de Fechar
            const btnFechar = document.createElement('button');
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

            btnFechar.onclick = function() {
                modal.style.opacity = '0';
                setTimeout(() => document.body.removeChild(modal), 300);
            };

            // 4. Monta e mostra tudo
            modal.appendChild(iframe);
            modal.appendChild(btnFechar);
            document.body.appendChild(modal);

            // Animação de entrada
            requestAnimationFrame(() => modal.style.opacity = '1');
        });
    }

    // Garante que o script carrega em segurança seja em que plataforma for
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarWidgetRC3D);
    } else {
        inicializarWidgetRC3D();
    }
})();
