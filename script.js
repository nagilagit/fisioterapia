// Variáveis globais
let qrCodeGenerated = null;
let currentQRValue = 0;
let currentPayload = "";
let currentPlayingVideo = null;
let currentLanguage = 'portuguese';

// =========================
// Modo claro/escuro
// =========================
function toggleMode() {
    const html = document.documentElement;
    html.classList.toggle('light');

    const img = document.querySelector('#profile img');
    if (!img) return;

    if (html.classList.contains('light')) {
        img.style.borderColor = '#FF1493';
        img.style.boxShadow = '0 0 20px rgba(255, 20, 147, 0.5)';
        img.src = './nagila.jpeg';
    } else {
        img.style.borderColor = '#FF69B4';
        img.style.boxShadow = '0 0 20px rgba(255, 105, 180, 0.5)';
        img.src = './nagila2.jpg';
    }
}

// =========================
// Contador de Likes
// =========================
function setupLikeButton() {
    const likeButton = document.getElementById('likeButton');
    const likeCount = document.getElementById('likeCount');

    if (likeButton && likeCount) {
        likeButton.addEventListener('click', function() {
            this.classList.toggle('liked');

            let currentText = likeCount.textContent;
            let isK = currentText.includes('K');
            let number = parseFloat(currentText.replace('K', ''));

            let absoluteNumber = isK ? number * 1000 : number;
            absoluteNumber += this.classList.contains('liked') ? 1 : -1;
            absoluteNumber = Math.max(0, absoluteNumber);

            if (absoluteNumber >= 1000) {
                likeCount.textContent = (absoluteNumber / 1000).toFixed(1).replace('.0', '') + 'K';
            } else {
                likeCount.textContent = absoluteNumber.toString();
            }

            this.setAttribute('aria-pressed', this.classList.contains('liked'));
        });
    }
}

// =========================
// Sistema de Tradução UNIFICADO (com troca PayPal/PIX)
// =========================
const translationsData = {
    portuguese: {
        bio: "Streamer • Fisioterapeuta • Criadora de Conteúdo",
        live: "Assistir minhas Lives",
        videos: "Vídeos Populares",
        journey: "Minha Jornada",
        support: "Seja um Apoiador",
        contact: "Contato Profissional",
        footer: "💖 Conteúdo diário no TikTok! 💖<br /> Live todos os dias às 20h",
        pixModalTitle: "💖 Apoie meu trabalho",
        pixModalDesc: "Digite o valor (mínimo R$1):",
        generateQR: "Gerar QR Code",
        copyQR: "Copiar QR Code",
        pixKeyText: "Ou copie a chave PIX:",
        journeyText: [
            "No TikTok, eu crio vídeos sobre diversos temas, mas meu foco principal é fazer lives para alegrar as pessoas, trazer energia positiva e diversão para o dia a dia.",
            "Gosto de usar essa plataforma para conectar com o público de forma autêntica e leve, sempre buscando espalhar boas vibrações.",
            "Além do TikTok, sou fisioterapeuta e adoro estudar para me aprimorar tanto na minha profissão quanto em outras áreas da vida.",
            "Acho que o aprendizado constante é essencial para crescer e ajudar melhor quem precisa."
        ]
    },
    english: {
        bio: "Streamer • Physiotherapist • Content Creator",
        live: "Watch my Live Streams",
        videos: "Popular Videos",
        journey: "My Journey",
        support: "Become a Supporter",
        contact: "Be a Supporter",
        footer: "💖 Daily content on TikTok! 💖<br /> Live every day at 8PM",
        pixModalTitle: "💖 Support my work",
        pixModalDesc: "Enter amount (minimum $1):",
        generateQR: "Generate QR Code",
        copyQR: "Copy QR Code",
        pixKeyText: "Or copy PIX key:",
        journeyText: [
            "On TikTok, I create videos on various topics, but my main focus is doing live streams to make people happy, bring positive energy, and fun to everyday life.",
            "I like using this platform to connect with the audience authentically and lightly, always seeking to spread good vibes.",
            "Besides TikTok, I am a physiotherapist and love studying to improve both in my profession and other areas of life.",
            "I believe constant learning is essential to grow and better help those in need."
        ]
    }
};

// Função principal de tradução (CRÍTICA: troca PayPal/PIX)
function translatePage(lang) {
    currentLanguage = lang;
    
    // 1️⃣ Adiciona a classe correta no body para CSS (controla exibição dos botões de doação)
    document.body.classList.remove('portuguese', 'english');
    document.body.classList.add(lang);
    
    // 2️⃣ Atualiza botões de idioma
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = lang === 'english' ? 'englishBtn' : 'portugueseBtn';
    document.getElementById(activeBtn).classList.add('active');
    
    const t = translationsData[lang];
    
    // 3️⃣ Traduz textos principais
    const bioEl = document.querySelector('.bio');
    if (bioEl) bioEl.textContent = t.bio;
    
    // Traduz links na ordem correta
    const navLinks = document.querySelectorAll('nav ul li a');
    const linkKeys = ['live', 'videos', 'journey', 'support', 'contact'];
    navLinks.forEach((link, index) => {
        if (linkKeys[index]) {
            link.textContent = t[linkKeys[index]];
        }
    });
    
    // Traduz footer
    const footer = document.querySelector('footer');
    if (footer) footer.innerHTML = t.footer;
    
    // 4️⃣ Atualiza modais se estiverem abertos
    const pixModal = document.getElementById('pixModal');
    if (pixModal && pixModal.style.display === 'flex') {
        updatePixModalLanguage(lang);
    }
    
    const journeyModal = document.getElementById('journeyModal');
    if (journeyModal && journeyModal.style.display === 'flex') {
        updateJourneyModalLanguage(lang);
    }
    
    // 5️⃣ Salva preferência
    localStorage.setItem('preferredLanguage', lang);
}

// Atualiza modal PIX com o idioma atual
function updatePixModalLanguage(lang) {
    const t = translationsData[lang];
    const title = document.getElementById('pixModalTitle');
    const desc = document.getElementById('pixModalDesc');
    const generateBtn = document.querySelector('#pixModal .generate-btn');
    const copyBtn = document.querySelector('#pixModal .action-btn');
    const pixKeyText = document.querySelector('#pixModal .pix-key p');
    
    if (title) title.textContent = t.pixModalTitle;
    if (desc) desc.textContent = t.pixModalDesc;
    if (generateBtn) generateBtn.textContent = t.generateQR;
    if (copyBtn && copyBtn.querySelector('span')) {
        copyBtn.querySelector('span').textContent = t.copyQR;
    }
    if (pixKeyText) pixKeyText.textContent = t.pixKeyText;
}

// Atualiza modal Jornada
function updateJourneyModalLanguage(lang) {
    const t = translationsData[lang];
    const journeyParagraphs = document.querySelectorAll('#journeyModal .text-content p');
    t.journeyText.forEach((text, index) => {
        if (journeyParagraphs[index]) {
            journeyParagraphs[index].textContent = text;
        }
    });
}

// Carrega idioma salvo
function loadSavedLanguage() {
    const savedLang = localStorage.getItem('preferredLanguage') || 'portuguese';
    translatePage(savedLang);
}

// =========================
// Modal PIX
// =========================
function showPixModal() {
    const modal = document.getElementById('pixModal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const valorInput = document.getElementById('valor');
    if (valorInput) valorInput.focus();
}

function hidePixModal() {
    const modal = document.getElementById('pixModal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function setupPixKeyCopy() {
    const keyBox = document.querySelector('.key-box');
    if (keyBox) {
        keyBox.addEventListener('click', function() {
            const chave = this.innerText.trim();
            copyToClipboard(chave).then(() => {
                const status = document.getElementById('status');
                if (status) {
                    status.textContent = currentLanguage === 'portuguese' ? 'Chave PIX copiada!' : 'PIX key copied!';
                    setTimeout(() => status.textContent = '', 3000);
                }
            });
        });
    }

    const copyQRBtn = document.getElementById("copyQRBtn");
    if (copyQRBtn) {
        copyQRBtn.addEventListener("click", function() {
            if (!currentPayload) {
                const status = document.getElementById("status");
                if (status) {
                    status.textContent = currentLanguage === 'portuguese' ? 'Gere o QR Code primeiro!' : 'Generate QR Code first!';
                    setTimeout(() => status.textContent = '', 3000);
                }
                return;
            }
            copyToClipboard(currentPayload).then(() => {
                const status = document.getElementById("status");
                if (status) {
                    status.textContent = currentLanguage === 'portuguese' ? 'Código PIX copiado!' : 'PIX code copied!';
                    setTimeout(() => status.textContent = '', 3000);
                }
            });
        });
    }
}

// Gerador PIX
function campo(tag, valor) {
    const tamanho = valor.length.toString().padStart(2, '0');
    return tag + tamanho + valor;
}

function gerarPix() {
    const inputValor = document.getElementById("valor");
    const statusEl = document.getElementById("status");
    if (!inputValor || !statusEl) return;

    const valor = parseFloat(inputValor.value.replace(',', '.'));
    if (isNaN(valor) || valor < 1) {
        statusEl.textContent = currentLanguage === 'portuguese' ? "Valor inválido! Mínimo R$1" : "Invalid amount! Minimum $1";
        return;
    }

    currentQRValue = valor;
    const chavePix = "622e3039-f634-4371-8086-66ed54f3f9a9";
    const nomeBeneficiario = "NAGILA LIMA DA CUNHA";
    const cidadeBeneficiario = "QUIXADA";
    const txid = "TX" + Date.now().toString().slice(-8);

    const merchantAccountInfo = campo("00", "br.gov.bcb.pix") + campo("01", chavePix);
    const additionalDataField = campo("05", txid);

    const payloadSemCRC =
        campo("00", "01") +
        campo("26", merchantAccountInfo) +
        campo("52", "0000") +
        campo("53", "986") +
        campo("54", valor.toFixed(2)) +
        campo("58", "BR") +
        campo("59", nomeBeneficiario) +
        campo("60", cidadeBeneficiario) +
        campo("62", additionalDataField) +
        "6304";

    const crc = calcularCRC16(payloadSemCRC);
    currentPayload = payloadSemCRC + crc;

    const qrContainer = document.getElementById("qrcode");
    if (qrContainer) {
        qrContainer.innerHTML = "";
        try {
            qrCodeGenerated = new QRCode(qrContainer, {
                text: currentPayload,
                width: 180,
                height: 180
            });
        } catch (error) {
            console.error("Erro ao gerar QR Code:", error);
            statusEl.textContent = currentLanguage === 'portuguese' ? "Erro ao gerar QR Code" : "Error generating QR Code";
            return;
        }
    }

    const copyBtn = document.getElementById("copyQRBtn");
    if (copyBtn) copyBtn.disabled = false;

    statusEl.textContent = (currentLanguage === 'portuguese' ? `QR Code de R$${valor.toFixed(2)} gerado!` : `QR Code for $${valor.toFixed(2)} generated!`);
}

function calcularCRC16(data) {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
            crc &= 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function changeValue(amount) {
    const input = document.getElementById("valor");
    if (!input) return;
    let value = parseInt(input.value) || 0;
    value += amount;
    if (value < 1) value = 1;
    input.value = value;
}

// =========================
// Modal PayPal
// =========================
function paypalModal() {
    const modal = document.getElementById('paypalModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        updatePaypalAmount();
    }
}

function hidePaypalModal() {
    const modal = document.getElementById('paypalModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function changePaypalValue(amount) {
    const input = document.getElementById('paypalValue');
    if (input) {
        let value = parseInt(input.value) + amount;
        value = Math.max(value, parseInt(input.min) || 2);
        input.value = value;
        updatePaypalAmount();
    }
}

function updatePaypalAmount() {
    const value = document.getElementById('paypalValue');
    const amountField = document.getElementById('paypalAmount');
    if (value && amountField) {
        amountField.value = value.value;
    }
}

// =========================
// Modal Vídeos
// =========================
function showVideosModal() {
    const modalContainer = document.getElementById("videosModalContainer");
    if (modalContainer) modalContainer.style.display = "block";
    const modal = document.getElementById('videosModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'auto';
        loadVideos();
        if (window.innerWidth <= 768) {
            setupMobileCarousel();
        }
    }
}

function loadVideos() {
    document.querySelectorAll('.video-item').forEach(item => {
        const videoId = item.getAttribute('data-video-id');
        if (!item.classList.contains('loaded') && videoId) {
            item.innerHTML = `
                <iframe src="https://www.tiktok.com/embed/v2/${videoId}?autoplay=0" 
                        frameborder="0" 
                        allowfullscreen 
                        allow="autoplay"
                        loading="lazy"
                        class="tiktok-iframe"></iframe>
                <div class="video-overlay">
                    <ion-icon name="play-circle-outline"></ion-icon>
                </div>`;
            item.style.position = 'relative';
            item.classList.add('loaded');
        }
    });
}

function setupMobileCarousel() {
    const videos = document.querySelectorAll('.video-item');
    const dotsContainer = document.querySelector('.carousel-dots');
    if (!dotsContainer) return;
    
    dotsContainer.innerHTML = '';
    videos.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = 'dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => {
            videos[i].scrollIntoView({ behavior: 'smooth' });
        });
        dotsContainer.appendChild(dot);
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const index = [...videos].indexOf(entry.target);
                document.querySelectorAll('.dot').forEach((dot, i) => {
                    dot.classList.toggle('active', i === index);
                });
            }
        });
    }, { threshold: 0.5 });

    videos.forEach(video => observer.observe(video));
}

document.addEventListener('click', function(e) {
    const overlay = e.target.closest('.video-overlay');
    if (overlay) {
        const videoItem = overlay.parentElement;
        const iframe = videoItem.querySelector('iframe');
        if (iframe) {
            iframe.src = iframe.src.replace('autoplay=0', 'autoplay=1');
            overlay.style.display = 'none';
        }
        return;
    }
});

function fecharmodal() {
    const modalContainer = document.getElementById("videosModalContainer");
    if (modalContainer) modalContainer.style.display = "none";
    document.body.style.overflow = 'auto';
}

// =========================
// Modal Jornada
// =========================
function showJourneyModal() {
    const modal = document.getElementById("journeyModal");
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        updateJourneyModalLanguage(currentLanguage);
    }
}

function hideJourneyModal() {
    const modal = document.getElementById("journeyModal");
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// =========================
// Utilitários
// =========================
function copyToClipboard(text) {
    return new Promise((resolve) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(resolve).catch(() => {
                fallbackCopy(text);
                resolve();
            });
        } else {
            fallbackCopy(text);
            resolve();
        }
    });
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

// =========================
// Eventos e Inicialização
// =========================
document.addEventListener('DOMContentLoaded', () => {
    setupLikeButton();
    setupPixKeyCopy();
    loadSavedLanguage();
});

// Eventos dos botões de idioma
const englishBtn = document.getElementById('englishBtn');
const portugueseBtn = document.getElementById('portugueseBtn');

if (englishBtn) {
    englishBtn.addEventListener('click', () => translatePage('english'));
}
if (portugueseBtn) {
    portugueseBtn.addEventListener('click', () => translatePage('portuguese'));
}
