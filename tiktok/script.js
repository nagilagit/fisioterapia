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

            // Obter o valor atual
            let currentText = likeCount.textContent;
            let isK = currentText.includes('K');
            let number = parseFloat(currentText.replace('K', ''));

            // Converter para número absoluto
            let absoluteNumber = isK ? number * 1000 : number;

            // Ajustar o valor (+1 ou -1)
            absoluteNumber += this.classList.contains('liked') ? 1 : -1;

            // Garantir que não fique negativo
            absoluteNumber = Math.max(0, absoluteNumber);

            // Formatando o resultado
            if (absoluteNumber >= 1000) {
                likeCount.textContent = (absoluteNumber / 1000).toFixed(1).replace('.0', '') + 'K';
            } else {
                likeCount.textContent = absoluteNumber.toString();
            }

            // Atualizar aria-pressed
            this.setAttribute('aria-pressed', this.classList.contains('liked'));
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupLikeButton();
    setupPixKeyCopy();
});

// =========================
// Modal PIX
// =========================
function showPixModal() {
    const modal = document.getElementById('pixModal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('valor').focus();
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
                    status.textContent = 'Chave PIX copiada!';
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
                    status.textContent = "Gere o QR Code primeiro!";
                    setTimeout(() => status.textContent = '', 3000);
                }
                return;
            }

            copyToClipboard(currentPayload).then(() => {
                const status = document.getElementById("status");
                if (status) {
                    status.textContent = "Código PIX copiado!";
                    setTimeout(() => status.textContent = '', 3000);
                }
            });
        });
    }
}

// =========================
// Gerador PIX
// =========================
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
        statusEl.textContent = "Valor inválido! Mínimo R$1";
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
            statusEl.textContent = "Erro ao gerar QR Code";
            return;
        }
    }

    const copyBtn = document.getElementById("copyQRBtn");
    if (copyBtn) copyBtn.disabled = false;

    statusEl.textContent = `QR Code de R$${valor.toFixed(2)} gerado!`;
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

// =========================
// Controle de valor PIX
// =========================
function changeValue(amount) {
    const input = document.getElementById("valor");
    if (!input) return;

    let value = parseInt(input.value) || 0;
    value += amount;
    if (value < 1) value = 1;
    input.value = value;

    const button = amount > 0 ? document.querySelector('.plus') : document.querySelector('.minus');
    if (button) {
        button.style.transform = 'scale(0.9)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 150);
    }
}

// =========================
// Modal de Vídeos
// =========================
function showVideosModal() {
    let modal1 = document.getElementById("videosModalContainer");
    modal1.style.display = "block";
    const modal = document.getElementById('videosModal');
    if (!modal) return;

    modal.style.display = 'block';
    document.body.style.overflow = 'auto';
    loadVideos();

    if (window.innerWidth <= 768) {
        setupMobileCarousel();
    }
}

function loadVideos() {
    document.querySelectorAll('.video-item').forEach(item => {
        const videoId = item.getAttribute('data-video-id');
        if (!item.classList.contains('loaded')) {
            item.innerHTML = `
                <iframe src="https://www.tiktok.com/embed/v2/${videoId}?autoplay=0" 
                        frameborder="0" 
                        allowfullscreen 
                        allow="autoplay"
                        loading="lazy"
                        class="tiktok-iframe"></iframe>
                <div class="video-overlay" style="display:flex; align-items:center; justify-content:center; position:absolute; top:0; left:0; right:0; bottom:0; cursor:pointer; background:rgba(0,0,0,0.3);">
                    <ion-icon name="play-circle-outline" style="font-size:64px; color:white;"></ion-icon>
                </div>`;
            item.style.position = 'relative';
            item.classList.add('loaded');
        }
    });
}

document.addEventListener('click', function(e) {
    const overlay = e.target.closest('.video-overlay');
    const modal = document.getElementById('videosModal');

    if (overlay) {
        const videoItem = overlay.parentElement;
        const iframe = videoItem.querySelector('iframe');

        if (currentPlayingVideo && currentPlayingVideo !== iframe) {
            const currentOverlay = currentPlayingVideo.parentElement.querySelector('.video-overlay');
            pauseVideo(currentPlayingVideo, currentOverlay);
        }

        playVideo(iframe, overlay);
        return;
    }

    if (modal && modal.style.display === 'block' && !e.target.closest('.video-item')) {
        if (currentPlayingVideo) {
            const overlay = currentPlayingVideo.parentElement.querySelector('.video-overlay');
            pauseVideo(currentPlayingVideo, overlay);
        }
    }
});

function playVideo(iframe, overlay) {
    if (window.innerWidth <= 768) {
        overlay.style.display = 'none';
        currentPlayingVideo = iframe;
        return;
    }

    if (iframe.src.includes('autoplay=1')) return;

    iframe.src = iframe.src.replace('autoplay=0', 'autoplay=1');
    overlay.style.display = 'none';
    currentPlayingVideo = iframe;
}

function pauseVideo(iframe, overlay) {
    if (window.innerWidth <= 768) {
        const src = iframe.src;
        iframe.src = '';
        iframe.src = src;
        if (overlay) overlay.style.display = 'flex';
        if (currentPlayingVideo === iframe) currentPlayingVideo = null;
        return;
    }

    if (!iframe.src.includes('autoplay=1')) return;

    iframe.src = iframe.src.replace('autoplay=1', 'autoplay=0');
    if (overlay) overlay.style.display = 'flex';
    if (currentPlayingVideo === iframe) currentPlayingVideo = null;
}

function setupMobileCarousel() {
    const dotsContainer = document.querySelector('.carousel-dots');
    const videos = document.querySelectorAll('.video-item');

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

                if (currentPlayingVideo) {
                    const iframe = entry.target.querySelector('iframe');
                    if (iframe && iframe === currentPlayingVideo && !entry.isIntersecting) {
                        const overlay = entry.target.querySelector('.video-overlay');
                        pauseVideo(iframe, overlay);
                    }
                }
            }
        });
    }, { threshold: 0.7 });

    videos.forEach(video => observer.observe(video));
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    document.querySelectorAll('.tiktok-iframe').forEach(iframe => {
        const overlay = iframe.parentElement.querySelector('.video-overlay');
        pauseVideo(iframe, overlay);
    });

    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentPlayingVideo = null;
}

// =========================
// Modal PayPal
// =========================
function paypalModal() {
    document.getElementById('paypalModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    updatePaypalAmount();
}

function hidePaypalModal() {
    document.getElementById('paypalModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function changePaypalValue(amount) {
    const input = document.getElementById('paypalValue');
    let value = parseInt(input.value) + amount;
    value = Math.max(value, parseInt(input.min));
    input.value = value;
    updatePaypalAmount();
}

function updatePaypalAmount() {
    const value = document.getElementById('paypalValue').value;
    document.getElementById('paypalAmount').value = value;
}

// =========================
// Modal Minha Jornada
// =========================
function showJourneyModal() {
    const modal = document.getElementById("journeyModal");
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function hideJourneyModal() {
    const modal = document.getElementById("journeyModal");
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function fecharmodal() {
    let modal1 = document.getElementById("videosModalContainer");
    modal1.style.display = "none";
    document.body.style.overflow = 'auto';
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
// Traduções
// =========================
const translations = {
    portuguese: {
        "Streamer • Physiotherapist • Content Creator": "Streamer • Fisioterapeuta • Criadora de Conteúdo",
        "Watch my Lives": "Assistir minhas Lives",
        "Popular Videos": "Vídeos Populares",
        "My Journey": "Minha Jornada",
        "Become a Supporter": "Seja um Apoiador",
        "Professional Contact": "Contato Profissional",
        "Enter the amount (minimum $1):": "Digite o valor (mínimo R$1):",
        "Decrease value": "Diminuir valor",
        "Increase value": "Aumentar valor",
        "Generate QR Code": "Gerar QR Code",
        "Or copy the PIX key:": "Ou copie a chave PIX:",
        "💖 Support my work": "💖 Apoie meu trabalho",
        "🌟 My Journey": "🌟 Minha Jornada",
        "On TikTok, I create videos on various topics, but my main focus is doing live streams to make people happy, bring positive energy, and fun to everyday life.": "No TikTok, eu crio vídeos sobre diversos temas, mas meu foco principal é fazer lives para alegrar as pessoas, trazer energia positiva e diversão para o dia a dia.",
        "I like using this platform to connect with the audience authentically and lightly, always seeking to spread good vibes.": "Gosto de usar essa plataforma para conectar com o público de forma autêntica e leve, sempre buscando espalhar boas vibrações.",
        "Besides TikTok, I am a physiotherapist and love studying to improve both in my profession and other areas of life.": "Além do TikTok, sou fisioterapeuta e adoro estudar para me aprimorar tanto na minha profissão quanto em outras áreas da vida.",
        "I believe constant learning is essential to grow and better help those in need.": "Acho que o aprendizado constante é essencial para crescer e ajudar melhor quem precisa.",
        "Portuguese": "Português",
        "English": "English",
        "Click here": "Clique aqui",
        "💖 Daily content on TikTok! 💖": "💖 Conteúdo diário no TikTok! 💖",
        "Live every day at 8 PM": "Live todos os dias às 20h",
        "💖 Support my work via PayPal": "💖 Support my work via PayPal",
        "One-time donation:": "One-time donation:",
        "Donate via PayPal": "Donate via PayPal",
        "* You will be redirected to PayPal's secure site": "* You will be redirected to PayPal's secure site"
    },
    english: {
        "Streamer • Fisioterapeuta • Criadora de Conteúdo": "Streamer • Physiotherapist • Content Creator",
        "Assistir minhas Lives": "Watch my Lives",
        "Vídeos Populares": "Popular Videos",
        "Minha Jornada": "My Journey",
        "Seja um Apoiador": "Become a Supporter",
        "Contato Profissional": "Professional Contact",
        "Digite o valor (mínimo R$1):": "Enter the amount (minimum $1):",
        "Diminuir valor": "Decrease value",
        "Aumentar valor": "Increase value",
        "Gerar QR Code": "Generate QR Code",
        "Ou copie a chave PIX:": "Or copy the PIX key:",
        "💖 Apoie meu trabalho": "💖 Support my work",
        "🌟 Minha Jornada": "🌟 My Journey",
        "No TikTok, eu crio vídeos sobre diversos temas, mas meu foco principal é fazer lives para alegrar as pessoas, trazer energia positiva e diversão para o dia a dia.": "On TikTok, I create videos on various topics, but my main focus is doing live streams to make people happy, bring positive energy, and fun to everyday life.",
        "Gosto de usar essa plataforma para conectar com o público de forma autêntica e leve, sempre buscando espalhar boas vibrações.": "I like using this platform to connect with the audience authentically and lightly, always seeking to spread good vibes.",
        "Além do TikTok, sou fisioterapeuta e adoro estudar para me aprimorar tanto na minha profissão quanto em outras áreas da vida.": "Besides TikTok, I am a physiotherapist and love studying to improve both in my profession and other areas of life.",
        "Acho que o aprendizado constante é essencial para crescer e ajudar melhor quem precisa.": "I believe constant learning is essential to grow and better help those in need.",
        "Português": "Portuguese",
        "English": "English",
        "Clique aqui": "Click here",
        "💖 Conteúdo diário no TikTok! 💖": "💖 Daily content on TikTok! 💖",
        "Live todos os dias às 20h": "Live every day at 8 PM",
        "💖 Support my work via PayPal": "💖 Support my work via PayPal",
        "One-time donation:": "One-time donation:",
        "Donate via PayPal": "Doar via PayPal",
        "* You will be redirected to PayPal's secure site": "* You will be redirected to PayPal's secure site"
    }
};

function translatePage(lang) {
    currentLanguage = lang;
    document.body.classList.remove('portuguese', 'english');
    document.body.classList.add(lang);

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;

    while (node = walker.nextNode()) {
        const trimmed = node.textContent.trim();
        if (translations[lang] && translations[lang][trimmed]) {
            node.textContent = translations[lang][trimmed];
        }
    }

    document.querySelectorAll('.lang-btn span').forEach(span => {
        const text = span.textContent.trim();
        if (translations[lang] && translations[lang][text]) {
            span.textContent = translations[lang][text];
        }
    });

    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    if (lang === 'english') {
        document.getElementById('englishBtn').classList.add('active');
    } else {
        document.getElementById('portugueseBtn').classList.add('active');
    }
}

// Eventos dos botões
document.getElementById('englishBtn').addEventListener('click', () => translatePage('english'));
document.getElementById('portugueseBtn').addEventListener('click', () => translatePage('portuguese'));