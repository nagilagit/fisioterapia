// Sistema de Internacionalização
const translations = {
    pt: {
        bio: "Streamer • Fisioterapeuta • Criadora de Conteúdo",
        links: {
            live: "Assistir minhas Lives",
            videos: "Vídeos Populares",
            journey: "Minha Jornada",
            support: "Seja um Apoiador",
            contact: "Contato Profissional"
        },
        footer: "💖 Conteúdo diário no TikTok! 💖<br /> Live todos os dias às 20h",
        pixModal: {
            title: "💖 Apoie meu trabalho",
            description: "Digite o valor (mínimo R$1):",
            button: "Gerar QR Code",
            copy: "Copiar QR Code",
            keyText: "Ou copie a chave PIX:"
        },
        journeyText: [
            "No TikTok, eu crio vídeos sobre diversos temas...",
            "Gosto de usar essa plataforma para conectar...",
            "Além do TikTok, sou fisioterapeuta...",
            "Acho que o aprendizado constante é essencial..."
        ]
    },
    en: {
        bio: "Streamer • Physiotherapist • Content Creator",
        links: {
            live: "Watch my Live Streams",
            videos: "Popular Videos",
            journey: "My Journey",
            support: "Become a Supporter",
            contact: "Professional Contact"
        },
        footer: "💖 Daily content on TikTok! 💖<br /> Live every day at 8PM",
        pixModal: {
            title: "💖 Support my work",
            description: "Enter amount (minimum $1):",
            button: "Generate QR Code",
            copy: "Copy QR Code",
            keyText: "Or copy PIX key:"
        },
        journeyText: [
            "On TikTok, I create videos on various topics...",
            "I like to use this platform to connect...",
            "Besides TikTok, I'm a physiotherapist...",
            "I believe continuous learning is essential..."
        ]
    }
};

// Função para trocar idioma
function changeLanguage(lang) {
    // Atualiza botões
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Atualiza textos
    document.querySelector('.bio').textContent = translations[lang].bio;
    document.querySelector('footer').innerHTML = translations[lang].footer;

    // Atualiza links
    document.querySelectorAll('nav a').forEach((link, index) => {
        const keys = Object.keys(translations[lang].links);
        link.textContent = translations[lang].links[keys[index]];
    });

    // Salva preferência
    localStorage.setItem('preferredLanguage', lang);

    // Atualiza modal PIX se estiver visível
    if (document.getElementById('pixModal').style.display === 'block') {
        updatePixModalLanguage(lang);
    }

    // Atualiza modal Jornada se estiver visível
    if (document.getElementById('journeyModal').style.display === 'block') {
        updateJourneyModalLanguage(lang);
    }
}

// Funções auxiliares para atualizar modais
function updatePixModalLanguage(lang) {
    const t = translations[lang].pixModal;
    document.getElementById('pixModalTitle').textContent = t.title;
    document.getElementById('pixModalDesc').textContent = t.description;
    document.querySelector('.generate-btn').textContent = t.button;
    document.querySelector('.action-btn span').textContent = t.copy;
    document.querySelector('.pix-key p').textContent = t.keyText;
}

function updateJourneyModalLanguage(lang) {
    const journeyTexts = document.querySelectorAll('.text-content p');
    translations[lang].journeyText.forEach((text, index) => {
        if (journeyTexts[index]) {
            journeyTexts[index].textContent = text;
        }
    });
}

// Carrega idioma salvo ao iniciar
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('preferredLanguage') || 'pt';
    changeLanguage(savedLang);
});