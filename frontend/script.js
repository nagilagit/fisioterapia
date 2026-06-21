const BACKEND_URL = 'https://api.nagilalima.site';
let currentLanguage = 'portuguese';
let socket = null;
let donorCount = 0;
let currentPaymentId = null;
let paymentCheckInterval = null;

let ttsEnabled = true;
let currentUtterance = null;
let messageQueue = [];
let isSpeaking = false;

// ============================================
// CONFIGURAÇÕES DE VALIDAÇÃO
// ============================================
const MAX_NAME_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 200;

const ttsConfig = {
    rate: 1.05,
    pitch: 1.05,
    volume: 0.9,
    voice: null
};

// ============================================
// FUNÇÕES TTS - LEITURA DE DOAÇÕES
// ============================================
function initTTSVoices() {
    if (!('speechSynthesis' in window)) {
        ttsEnabled = false;
        console.warn('⚠️ TTS não suportado neste navegador');
        return;
    }

    const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        
        if (voices.length === 0) {
            setTimeout(loadVoices, 500);
            return;
        }

        const portugueseVoice = 
            voices.find(v => v.lang.startsWith('pt-BR') && v.name.includes('Natural')) ||
            voices.find(v => v.lang.startsWith('pt-BR') && v.name.includes('Neural')) ||
            voices.find(v => v.lang.startsWith('pt-BR') && v.name.includes('Google')) ||
            voices.find(v => v.lang.startsWith('pt-BR') && v.name.includes('Heloisa')) ||
            voices.find(v => v.lang.startsWith('pt-BR'));
        
        if (portugueseVoice) {
            ttsConfig.voice = portugueseVoice;
            console.log('✅ Voz TTS configurada:', portugueseVoice.name);
        } else {
            ttsConfig.voice = voices[0] || null;
        }
    };

    loadVoices();
    
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
}

function processMessageQueue() {
    if (isSpeaking || messageQueue.length === 0 || !ttsEnabled) return;

    const nextMessage = messageQueue.shift();
    isSpeaking = true;

    const { nome, mensagem, valor, metodo, origem } = nextMessage;
    const valorFormatado = metodo === 'PIX' ? `R$${valor.toFixed(2)}` : `US$${valor.toFixed(2)}`;
    
    const frasesInicio = [
        `Nova doação!`,
        `Recebemos uma doação!`,
        `Olha só!`,
        `Agora agora...`,
        `Temos uma nova doação!`,
        `Acabou de chegar uma doação!`
    ];
    
    const frasesAgradecimento = [
        `Muito obrigado`,
        `Agradeço demais`,
        `Que incrível`,
        `Fico muito feliz`,
        `Que gesto lindo`,
        `Você é demais`
    ];
    
    const randomInicio = frasesInicio[Math.floor(Math.random() * frasesInicio.length)];
    const randomAgradecimento = frasesAgradecimento[Math.floor(Math.random() * frasesAgradecimento.length)];
    
    let texto = `${randomInicio} ${nome} doou ${valorFormatado}`;
    
    if (mensagem && mensagem.trim() !== '') {
        texto += ` e disse: ${mensagem}`;
    }
    
    texto += `, ${randomAgradecimento}!`;
    
    if (donorCount > 0 && donorCount % 5 === 0) {
        texto += ` Já são ${donorCount} doações!`;
    }
    
    // Diferencia doação externa
    if (origem === 'externa') {
        texto += ` Recebida via página de doações!`;
    }

    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }

    currentUtterance = new SpeechSynthesisUtterance(texto);
    currentUtterance.lang = 'pt-BR';
    currentUtterance.rate = ttsConfig.rate;
    currentUtterance.pitch = ttsConfig.pitch;
    currentUtterance.volume = ttsConfig.volume;
    
    if (ttsConfig.voice) {
        currentUtterance.voice = ttsConfig.voice;
    }

    currentUtterance.onend = () => {
        isSpeaking = false;
        currentUtterance = null;
        setTimeout(() => processMessageQueue(), 150);
    };

    currentUtterance.onerror = () => {
        isSpeaking = false;
        currentUtterance = null;
        setTimeout(() => processMessageQueue(), 200);
    };

    try {
        window.speechSynthesis.speak(currentUtterance);
    } catch (error) {
        isSpeaking = false;
        currentUtterance = null;
        processMessageQueue();
    }
}

function speakDonationMessage(nome, mensagem, valor, metodo, origem = 'interna') {
    if (!ttsEnabled) return;

    if (messageQueue.length > 20) {
        messageQueue = messageQueue.slice(-10);
    }

    messageQueue.push({ 
        nome: nome || 'Anônimo', 
        mensagem: mensagem || '', 
        valor: valor || 0, 
        metodo: metodo || 'PIX',
        origem: origem || 'interna'
    });
    
    setTimeout(() => processMessageQueue(), 100);
}

function speakCustomMessage(texto) {
    if (!ttsEnabled) return;

    if (currentUtterance) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        currentUtterance = null;
    }

    messageQueue.push({ 
        nome: 'Sistema', 
        mensagem: texto, 
        valor: 0, 
        metodo: 'SISTEMA',
        origem: 'sistema'
    });
    
    setTimeout(() => processMessageQueue(), 100);
}

function toggleTTS() {
    ttsEnabled = !ttsEnabled;
    const btn = document.getElementById('ttsToggleBtn');
    if (btn) {
        btn.innerHTML = ttsEnabled ? '🔊 TTS Ligado' : '🔇 TTS Desligado';
        btn.classList.toggle('active', ttsEnabled);
    }
    
    if (!ttsEnabled && currentUtterance) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        messageQueue = [];
    }
    
    localStorage.setItem('ttsEnabled', ttsEnabled);
}

// ============================================
// WEBSOCKET
// ============================================
function connectWebSocket() {
    socket = io(BACKEND_URL, {
        transports: ['websocket'],
        autoConnect: true
    });
    
    socket.on('connect', () => {
        addSystemMessage('🟢 Live conectada - doações em tempo real!');
    });
    
    socket.on('status-inicial', (data) => {
        donorCount = data.donorCount || 0;
        updateDonorCounter();
    });
    
    socket.on('nova-doacao', (doacao) => {
        donorCount = doacao.donorCount;
        updateDonorCounter();
        
        // Determina origem
        const origem = doacao.origem || 'interna';
        
        showDonationAlert(doacao.nome, doacao.valor, doacao.metodo, doacao.mensagem, origem);
        speakDonationMessage(doacao.nome, doacao.mensagem, doacao.valor, doacao.metodo, origem);
        
        if (donorCount % 10 === 0) {
            showConfetti();
            speakCustomMessage(`Uau! ${donorCount} doações! Muito obrigada a todos!`);
        }
        
        if (origem === 'externa') {
            addSystemMessage(`💙 Doação externa: ${doacao.nome} doou R$ ${doacao.valor}`);
        }
    });
    
    socket.on('disconnect', () => {
        addSystemMessage('🔴 Reconectando à live...');
        setTimeout(() => connectWebSocket(), 3000);
    });
}

function updateDonorCounter() {
    const donorElement = document.getElementById('donorCount');
    if (donorElement) {
        donorElement.textContent = donorCount;
        donorElement.style.transform = 'scale(1.2)';
        setTimeout(() => {
            donorElement.style.transform = 'scale(1)';
        }, 300);
    }
}

function showDonationAlert(nome, valor, metodo, mensagem = '', origem = 'interna') {
    const alerta = document.createElement('div');
    alerta.className = 'donation-alert';
    const metodoIcon = metodo === 'PIX' ? '💚' : '💙';
    const metodoNome = metodo === 'PIX' ? 'PIX' : 'PayPal';
    
    const corFundo = origem === 'externa' 
        ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' 
        : 'linear-gradient(135deg, #ff69b4, #ff1493)';
    
    alerta.style.background = corFundo;
    
    let mensagemHtml = '';
    if (mensagem && mensagem.trim() !== '') {
        mensagemHtml = `<div class="donation-message">"${escapeHtml(mensagem)}"</div>`;
    }
    
    const frasesExtra = [
        '🎉 Que incrível!',
        '💖 Muito obrigado!',
        '🌟 Você é demais!',
        '🙏 Gratidão!',
        '✨ Que gesto lindo!',
        '💕 Amo vocês!'
    ];
    const randomFrase = frasesExtra[Math.floor(Math.random() * frasesExtra.length)];
    
    const origemTag = origem === 'externa' 
        ? '<span style="font-size:10px; background:rgba(255,255,255,0.2); padding:2px 10px; border-radius:20px; margin-left:8px;">🌐 externa</span>' 
        : '';
    
    alerta.innerHTML = `
        <div class="donation-content">
            <span class="heart-icon">${metodoIcon}</span>
            <div style="flex:1; min-width:0;">
                <div class="donor-name" style="font-size: 16px;">
                    🌟 ${escapeHtml(nome)} ${origemTag}
                </div>
                <div class="donation-amount" style="font-size: 15px; margin: 4px 0;">
                    doou <strong>${metodo === 'PIX' ? 'R$' : 'US$'} ${valor.toFixed(2)}</strong> ${metodoNome}
                </div>
                ${mensagemHtml}
                <div style="font-size: 13px; margin-top: 4px; color: #ffd700;">
                    ${randomFrase}
                </div>
                <div style="font-size: 11px; opacity: 0.7; margin-top: 2px;">
                    Total de doações: ${donorCount}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(alerta);
    
    setTimeout(() => {
        if (alerta && alerta.parentNode) {
            alerta.style.animation = 'fadeOut 0.5s ease forwards';
            setTimeout(() => {
                if (alerta.parentNode) alerta.remove();
            }, 500);
        }
    }, 8000);
}

function showConfetti() {
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: fixed;
            left: ${Math.random() * 100}%;
            top: -20px;
            width: 8px;
            height: 8px;
            background: ${['#ff69b4', '#ff1493', '#ff0000', '#ffa500', '#ffff00', '#8b5cf6', '#10b981'][Math.floor(Math.random() * 7)]};
            border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
            animation: fall ${Math.random() * 3 + 2}s linear forwards;
            z-index: 9999;
            pointer-events: none;
        `;
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 5000);
    }
}

function addSystemMessage(msg) {
    const alerta = document.createElement('div');
    alerta.className = 'donation-alert';
    alerta.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
    alerta.innerHTML = `<div class="donation-content">${msg}</div>`;
    document.body.appendChild(alerta);
    setTimeout(() => {
        if (alerta.parentNode) alerta.remove();
    }, 4000);
}

function toggleMode() {
    const html = document.documentElement;
    html.classList.toggle('light');
    const img = document.querySelector('#profile img');
    if (!img) return;
    
    if (html.classList.contains('light')) {
        img.style.borderColor = '#FF1493';
        img.style.boxShadow = '0 0 20px rgba(255, 20, 147, 0.5)';
        img.src = './frontend/nagila.jpeg';
    } else {
        img.style.borderColor = '#FF69B4';
        img.style.boxShadow = '0 0 20px rgba(255, 105, 180, 0.5)';
        img.src = './frontend/nagila2.jpg';
    }
}

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

// ============================================
// MODAIS - PIX
// ============================================
function showPixModal() {
    const modal = document.getElementById('pixModal');
    if (modal) modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('pixDonorName').value = '';
    document.getElementById('pixDonorMessage').value = '';
    document.getElementById('valor').value = '5';
    document.getElementById('pixStatus').innerHTML = '';
    document.getElementById('qrcode').innerHTML = '';
    document.getElementById('qrcode').style.display = 'none';
    
    if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval);
        paymentCheckInterval = null;
    }
}

function hidePixModal() {
    const modal = document.getElementById('pixModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval);
        paymentCheckInterval = null;
    }
}

function changePixValue(amount) {
    const input = document.getElementById('valor');
    if (input) {
        let value = parseInt(input.value) + amount;
        if (value < 1) value = 1;
        input.value = value;
    }
}

async function gerarPix() {
    const valorInput = document.getElementById('valor');
    const nomeInput = document.getElementById('pixDonorName');
    const mensagemInput = document.getElementById('pixDonorMessage');
    const statusEl = document.getElementById('pixStatus');
    const qrcodeDiv = document.getElementById('qrcode');
    const copyQRBtn = document.getElementById('copyQRBtn');
    
    const valor = parseFloat(valorInput.value);
    const nome = nomeInput?.value.trim() || 'Anonimo';
    const mensagem = mensagemInput?.value.trim() || '';
    
    if (nome.length > MAX_NAME_LENGTH) {
        statusEl.textContent = `❌ Nome excede ${MAX_NAME_LENGTH} caracteres (${nome.length}/${MAX_NAME_LENGTH})`;
        statusEl.style.color = "#ff4444";
        return;
    }
    
    if (mensagem.length > MAX_MESSAGE_LENGTH) {
        statusEl.textContent = `❌ Mensagem excede ${MAX_MESSAGE_LENGTH} caracteres (${mensagem.length}/${MAX_MESSAGE_LENGTH})`;
        statusEl.style.color = "#ff4444";
        return;
    }
    
    if (isNaN(valor) || valor < 1) {
        statusEl.textContent = "❌ Valor inválido! Mínimo R$1";
        statusEl.style.color = "#ff4444";
        return;
    }
    
    statusEl.textContent = "⏳ Criando pagamento PIX...";
    statusEl.style.color = "#ffa500";
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/create-pix-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, valor, mensagem })
        });
        
        const data = await response.json();
        
        if (data.success && data.qr_code_base64) {
            qrcodeDiv.innerHTML = '';
            
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${data.qr_code_base64}`;
            img.alt = 'QR Code PIX';
            qrcodeDiv.appendChild(img);
            qrcodeDiv.style.display = 'flex';
            
            if (copyQRBtn) {
                copyQRBtn.disabled = false;
                copyQRBtn.setAttribute('aria-disabled', 'false');
                copyQRBtn.removeEventListener('click', copyQRCodeHandler);
                copyQRBtn.addEventListener('click', copyQRCodeHandler);
                copyQRBtn.pixCode = data.qr_code;
            }
            
            statusEl.innerHTML = `✨ QR Code gerado! ✨<br>📱 Escaneie com o app do seu banco ou <strong>copie o código PIX abaixo</strong>`;
            statusEl.style.color = "#00ff88";
            
            currentPaymentId = data.payment_id;
            
            await fetch(`${BACKEND_URL}/api/pending-donation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    nome, 
                    valor, 
                    metodo: 'PIX',
                    mensagem: mensagem,
                    status: 'Aguardando pagamento PIX... ⏳'
                })
            });
            
            if (paymentCheckInterval) clearInterval(paymentCheckInterval);
            paymentCheckInterval = setInterval(() => verificarPagamento(currentPaymentId, valor, nome, mensagem), 5000);
            
        } else {
            throw new Error(data.error || 'Erro ao criar pagamento');
        }
        
    } catch (error) {
        statusEl.textContent = `❌ Erro: ${error.message}`;
        statusEl.style.color = "#ff4444";
        qrcodeDiv.style.display = 'none';
        if (copyQRBtn) copyQRBtn.disabled = true;
    }
}

function copyQRCodeHandler(event) {
    const pixCode = event.currentTarget.pixCode;
    if (pixCode) {
        copyToClipboard(pixCode);
        const statusEl = document.getElementById('pixStatus');
        if (statusEl) {
            statusEl.innerHTML = '📋 Código PIX copiado! Cole no app do seu banco.';
            statusEl.style.color = "#00ff88";
            setTimeout(() => {
                if (statusEl.innerHTML === '📋 Código PIX copiado! Cole no app do seu banco.') {
                    statusEl.innerHTML = `✨ QR Code gerado! ✨<br>📱 Escaneie com o app do seu banco ou <strong>copie o código PIX abaixo</strong>`;
                }
            }, 3000);
        }
    }
}

async function verificarPagamento(paymentId) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/check-payment/${paymentId}`);
        const data = await response.json();
        
        if (data.paid === true) {
            clearInterval(paymentCheckInterval);
            paymentCheckInterval = null;
            
            const statusEl = document.getElementById('pixStatus');
            statusEl.innerHTML = "🎉 Pagamento confirmado! Obrigado pelo apoio!";
            statusEl.style.color = "#00ff88";
            
            setTimeout(() => {
                hidePixModal();
            }, 2000);
        }
    } catch (error) {
        // Silently continue checking
    }
}

// ============================================
// MODAIS - PAYPAL
// ============================================
function showPaypalModal() {
    const modal = document.getElementById('paypalModal');
    if (modal) modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('paypalDonorName').value = '';
    document.getElementById('paypalDonorMessage').value = '';
    document.getElementById('paypalValue').value = '10';
    updatePaypalAmount();
}

function hidePaypalModal() {
    const modal = document.getElementById('paypalModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function changePaypalValue(amount) {
    const input = document.getElementById('paypalValue');
    if (input) {
        let value = parseInt(input.value) + amount;
        if (value < 2) value = 2;
        input.value = value;
        updatePaypalAmount();
    }
}

function updatePaypalAmount() {
    const value = document.getElementById('paypalValue');
    const amountField = document.getElementById('paypalAmount');
    const nameInput = document.getElementById('paypalDonorName');
    const messageInput = document.getElementById('paypalDonorMessage');
    const itemNameField = document.getElementById('paypalItemName');
    
    if (value && amountField) {
        amountField.value = value.value;
    }
    if (nameInput && itemNameField) {
        const nome = nameInput.value.trim() || 'Anonymous';
        const mensagem = messageInput?.value.trim() || '';
        let itemName = `Donation from ${nome} - Nagila Lima Live`;
        if (mensagem) {
            itemName += ` | Message: "${mensagem}"`;
        }
        itemNameField.value = itemName;
    }
}

// ============================================
// MODAIS - VÍDEOS
// ============================================
function showVideosModal() {
    const modalContainer = document.getElementById("videosModalContainer");
    if (modalContainer) modalContainer.style.display = "block";
    const modal = document.getElementById('videosModal');
    if (modal) {
        modal.style.display = 'block';
        loadVideos();
    }
}

function fecharmodal() {
    const modalContainer = document.getElementById("videosModalContainer");
    if (modalContainer) modalContainer.style.display = "none";
    document.body.style.overflow = 'auto';
}

function loadVideos() {
    document.querySelectorAll('.video-item').forEach(item => {
        const videoId = item.getAttribute('data-video-id');
        if (!item.classList.contains('loaded') && videoId) {
            item.innerHTML = `<iframe src="https://www.tiktok.com/embed/v2/${videoId}?autoplay=0" frameborder="0" allowfullscreen style="width:100%;height:100%;"></iframe>`;
            item.classList.add('loaded');
        }
    });
}

// ============================================
// MODAIS - JORNADA
// ============================================
function showJourneyModal() {
    const modal = document.getElementById("journeyModal");
    if (modal) modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function hideJourneyModal() {
    const modal = document.getElementById("journeyModal");
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ============================================
// MODAIS - RANKING
// ============================================
function showRankingModal() {
    const modal = document.getElementById("rankingModal");
    if (modal) modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    loadRanking();
}

function hideRankingModal() {
    const modal = document.getElementById("rankingModal");
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

async function loadRanking() {
    const content = document.getElementById('rankingContent');
    if (!content) return;
    
    content.innerHTML = '<p style="text-align:center; opacity:0.7;">⏳ Carregando ranking...</p>';
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/donor-ranking`);
        const data = await response.json();
        
        if (data.ranking && data.ranking.length > 0) {
            let html = '';
            data.ranking.forEach((item, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
                const topClass = index === 0 ? 'top1' : index === 1 ? 'top2' : index === 2 ? 'top3' : '';
                html += `
                    <div class="ranking-item ${topClass}">
                        <span class="ranking-position">${medal}</span>
                        <span class="ranking-name">${escapeHtml(item.nome)}</span>
                        <span class="ranking-total">${item.count}x • R$ ${item.total.toFixed(2)}</span>
                    </div>
                `;
            });
            content.innerHTML = html;
        } else {
            content.innerHTML = '<p style="text-align:center; opacity:0.7;">📭 Nenhum doador ainda. Seja o primeiro! 💖</p>';
        }
    } catch (error) {
        content.innerHTML = '<p style="text-align:center; color:#ff4444;">❌ Erro ao carregar ranking</p>';
    }
}

// ============================================
// TRADUÇÃO
// ============================================
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
        pixModalDesc: "Digite o valor (mínimo R$1):"
    },
    english: {
        bio: "Streamer • Physiotherapist • Content Creator",
        live: "Watch my Live Streams",
        videos: "Popular Videos",
        journey: "My Journey",
        support: "Be a Supporter",
        contact: "Professional Contact",
        footer: "💖 Daily content on TikTok! 💖<br /> Live every day at 8PM",
        pixModalTitle: "💖 Support my work",
        pixModalDesc: "Enter amount (minimum $1):"
    }
};

function translatePage(lang) {
    currentLanguage = lang;
    document.body.classList.remove('portuguese', 'english');
    document.body.classList.add(lang);
    
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = lang === 'english' ? 'englishBtn' : 'portugueseBtn';
    document.getElementById(activeBtn).classList.add('active');
    
    const translations = {
        portuguese: {
            bio: "Streamer • Fisioterapeuta • Criadora de Conteúdo",
            live: "Assistir minhas Lives",
            videos: "Vídeos Populares",
            journey: "Minha Jornada",
            ranking: "🏆 Ranking de Doadores",
            support: "Seja um Apoiador",
            contact: "Contato Profissional",
            footer: "💖 Conteúdo diário no TikTok! 💖<br /> Live todos os dias às 20h",
            pixModalTitle: "💖 Apoie meu trabalho",
            pixModalDesc: "Digite o valor (mínimo R$1):",
            paypalModalTitle: "💖 Apoie meu trabalho via PayPal",
            paypalDesc: "Doação única:",
            paypalButton: "Doar via PayPal",
            paypalNote: "* Você será redirecionado para o site seguro do PayPal",
            videosTitle: "🎥 Vídeos Populares",
            journeyTitle: "🌟 Minha Jornada",
            journeyContent: `<p>No TikTok, eu crio vídeos sobre diversos temas, mas meu foco principal é fazer lives para alegrar as pessoas, trazer energia positiva e diversão para o dia a dia.</p>
                            <p>Gosto de usar essa plataforma para conectar com o público de forma autêntica e leve, sempre buscando espalhar boas vibrações.</p>
                            <br>
                            <p>Além do TikTok, sou fisioterapeuta e adoro estudar para me aprimorar tanto na minha profissão quanto em outras áreas da vida.</p>
                            <p>Acho que o aprendizado constante é essencial para crescer e ajudar melhor quem precisa.</p>`,
            rankingTitle: "🏆 Ranking de Doadores",
            rankingLoading: "Carregando ranking..."
        },
        english: {
            bio: "Streamer • Physiotherapist • Content Creator",
            live: "Watch my Live Streams",
            videos: "Popular Videos",
            journey: "My Journey",
            ranking: "🏆 Donor Ranking",
            support: "Be a Supporter",
            contact: "Professional Contact",
            footer: "💖 Daily content on TikTok! 💖<br /> Live every day at 8PM",
            pixModalTitle: "💖 Support my work",
            pixModalDesc: "Enter amount (minimum R$1):",
            paypalModalTitle: "💖 Support my work via PayPal",
            paypalDesc: "One-time donation:",
            paypalButton: "Donate via PayPal",
            paypalNote: "* You will be redirected to PayPal's secure website",
            videosTitle: "🎥 Popular Videos",
            journeyTitle: "🌟 My Journey",
            journeyContent: `<p>On TikTok, I create videos on various topics, but my main focus is doing lives to make people happy, bring positive energy and fun to everyday life.</p>
                            <p>I like to use this platform to connect with the audience in an authentic and light way, always seeking to spread good vibes.</p>
                            <br>
                            <p>Besides TikTok, I'm a physiotherapist and I love studying to improve myself both in my profession and in other areas of life.</p>
                            <p>I believe that constant learning is essential to grow and help those in need.</p>`,
            rankingTitle: "🏆 Donor Ranking",
            rankingLoading: "Loading ranking..."
        }
    };
    
    const t = translations[lang];
    
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        if (t[key] !== undefined) {
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = t[key];
            } else if (key === 'journeyContent') {
                element.innerHTML = t[key];
            } else {
                element.textContent = t[key];
            }
        }
    });
    
    const supportBtnPT = document.getElementById('supportButtonPT');
    const supportBtnEN = document.getElementById('supportButtonEN');
    if (supportBtnPT && supportBtnEN) {
        const supportText = t.support;
        supportBtnPT.textContent = supportText;
        supportBtnEN.textContent = supportText;
    }
    
    const pixTitle = document.getElementById('pixModalTitle');
    const pixDesc = document.getElementById('pixModalDesc');
    if (pixTitle) pixTitle.textContent = t.pixModalTitle;
    if (pixDesc) pixDesc.textContent = t.pixModalDesc;
    
    const paypalTitle = document.getElementById('paypalModalTitle');
    const paypalDesc = document.querySelector('.donation-text');
    const paypalButton = document.querySelector('.donate-btn');
    const paypalNote = document.querySelector('.donation-note');
    if (paypalTitle) paypalTitle.textContent = t.paypalModalTitle;
    if (paypalDesc) paypalDesc.textContent = t.paypalDesc;
    if (paypalButton) {
        paypalButton.innerHTML = `<ion-icon name="logo-paypal"></ion-icon> ${t.paypalButton}`;
    }
    if (paypalNote) paypalNote.textContent = t.paypalNote;
    
    const videosTitle = document.querySelector('#videosModal h3');
    if (videosTitle) {
        const closeBtn = videosTitle.querySelector('button');
        videosTitle.textContent = t.videosTitle;
        if (closeBtn) videosTitle.appendChild(closeBtn);
    }
    
    const journeyTitle = document.querySelector('#journeyModal h3');
    if (journeyTitle) journeyTitle.textContent = t.journeyTitle;
    
    const rankingTitle = document.querySelector('#rankingModal h3');
    const rankingLoading = document.querySelector('#rankingModal [data-translate="rankingLoading"]');
    if (rankingTitle) rankingTitle.textContent = t.rankingTitle;
    if (rankingLoading) rankingLoading.textContent = t.rankingLoading;
    
    localStorage.setItem('preferredLanguage', lang);
}

function loadSavedLanguage() {
    const savedLang = localStorage.getItem('preferredLanguage') || 'portuguese';
    translatePage(savedLang);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        const status = document.getElementById('pixStatus');
        if (status) {
            status.innerHTML = '📋 Código copiado!';
            setTimeout(() => {
                if (status.innerHTML === '📋 Código copiado!') {
                    status.innerHTML = '✅ QR Code gerado! Escaneie com seu banco para pagar.';
                }
            }, 2000);
        }
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    });
}

// ============================================
// CONTADOR DE CARACTERES
// ============================================
function setupCharCounter(inputId, counterId, maxLength) {
    const input = document.getElementById(inputId);
    const counter = document.getElementById(counterId);
    
    if (!input || !counter) return;
    
    input.style.color = '#ffffff';
    
    function updateCounter() {
        const currentLength = input.value.length;
        const remaining = maxLength - currentLength;
        
        counter.textContent = `${currentLength}/${maxLength}`;
        counter.classList.remove('warning', 'danger');
        
        if (remaining <= 10) {
            counter.classList.add('warning');
        }
        if (remaining <= 3) {
            counter.classList.add('danger');
        }
        
        if (remaining <= 3) {
            input.style.borderColor = '#ef4444';
            input.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.15)';
        } else if (remaining <= 10) {
            input.style.borderColor = '#fbbf24';
            input.style.boxShadow = '0 0 20px rgba(251, 191, 36, 0.1)';
        } else {
            input.style.borderColor = '';
            input.style.boxShadow = '';
        }
    }
    
    input.addEventListener('input', updateCounter);
    input.addEventListener('paste', () => {
        setTimeout(updateCounter, 10);
    });
    
    updateCounter();
}

// ============================================
// EVENTO PRINCIPAL - DOM CARREGADO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Página principal carregada!');
    
    setupLikeButton();
    loadSavedLanguage();
    connectWebSocket();
    initTTSVoices();
    
    const savedTTS = localStorage.getItem('ttsEnabled');
    if (savedTTS !== null) {
        ttsEnabled = savedTTS === 'true';
        const btn = document.getElementById('ttsToggleBtn');
        if (btn) {
            btn.innerHTML = ttsEnabled ? '🔊 TTS Ligado' : '🔇 TTS Desligado';
            btn.classList.toggle('active', ttsEnabled);
        }
    }
    
    setupCharCounter('pixDonorName', 'nameCounter', MAX_NAME_LENGTH);
    setupCharCounter('pixDonorMessage', 'messageCounter', MAX_MESSAGE_LENGTH);
    setupCharCounter('paypalDonorName', 'paypalNameCounter', MAX_NAME_LENGTH);
    setupCharCounter('paypalDonorMessage', 'paypalMessageCounter', MAX_MESSAGE_LENGTH);
    
    const keyBox = document.querySelector('.key-box');
    if (keyBox) {
        keyBox.addEventListener('click', function() {
            copyToClipboard(this.innerText.trim());
            const status = document.getElementById('pixStatus');
            if (status) {
                const originalText = status.innerHTML;
                status.innerHTML = '📋 Chave PIX copiada!';
                status.style.color = '#00ff88';
                setTimeout(() => {
                    if (status.innerHTML === '📋 Chave PIX copiada!') {
                        status.innerHTML = originalText;
                    }
                }, 2000);
            }
        });
    }
    
    window.onclick = function(event) {
        const pixModal = document.getElementById('pixModal');
        if (event.target === pixModal) hidePixModal();
        const paypalModal = document.getElementById('paypalModal');
        if (event.target === paypalModal) hidePaypalModal();
        const videosModal = document.getElementById('videosModal');
        if (event.target === videosModal) fecharmodal();
        const journeyModal = document.getElementById('journeyModal');
        if (event.target === journeyModal) hideJourneyModal();
        const rankingModal = document.getElementById('rankingModal');
        if (event.target === rankingModal) hideRankingModal();
    };
    
    const paypalForm = document.getElementById('paypalForm');
    const paypalNameInput = document.getElementById('paypalDonorName');
    const paypalMessageInput = document.getElementById('paypalDonorMessage');
    const paypalValueInput = document.getElementById('paypalValue');
    
    if (paypalNameInput) {
        paypalNameInput.addEventListener('input', updatePaypalAmount);
    }
    if (paypalMessageInput) {
        paypalMessageInput.addEventListener('input', updatePaypalAmount);
    }
    
    if (paypalForm) {
        paypalForm.addEventListener('submit', async function(e) {
            const nome = paypalNameInput?.value.trim() || 'Anonymous';
            const mensagem = paypalMessageInput?.value.trim() || '';
            const valor = parseFloat(paypalValueInput?.value) || 10;
            
            if (nome.length > MAX_NAME_LENGTH) {
                e.preventDefault();
                alert(`❌ Nome excede ${MAX_NAME_LENGTH} caracteres (${nome.length}/${MAX_NAME_LENGTH})`);
                return;
            }
            
            if (mensagem.length > MAX_MESSAGE_LENGTH) {
                e.preventDefault();
                alert(`❌ Mensagem excede ${MAX_MESSAGE_LENGTH} caracteres (${mensagem.length}/${MAX_MESSAGE_LENGTH})`);
                return;
            }
            
            try {
                await fetch(`${BACKEND_URL}/api/simulate-donation`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        nome, 
                        valor, 
                        metodo: 'PayPal',
                        mensagem: mensagem
                    })
                });
            } catch (error) {
                // Silently continue
            }
        });
    }
});

const englishBtn = document.getElementById('englishBtn');
const portugueseBtn = document.getElementById('portugueseBtn');
if (englishBtn) englishBtn.addEventListener('click', () => translatePage('english'));
if (portugueseBtn) portugueseBtn.addEventListener('click', () => translatePage('portuguese'));

// ============================================
// INJEÇÃO DE ESTILOS PARA ANIMAÇÕES
// ============================================
const styleInject = document.createElement('style');
styleInject.textContent = `
    @keyframes fall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
    }
    @keyframes fadeOut {
        to { opacity: 0; visibility: hidden; transform: scale(0.9); }
    }
    .donation-alert {
        position: fixed;
        bottom: 30px;
        right: 20px;
        color: white;
        padding: 20px 25px;
        border-radius: 60px;
        animation: slideInRight 0.4s ease;
        z-index: 10000;
        box-shadow: 0 8px 30px rgba(255, 20, 147, 0.5);
        font-weight: bold;
        max-width: 400px;
        min-width: 280px;
    }
    @keyframes slideInRight {
        from { transform: translateX(120%) scale(0.8); opacity: 0; }
        to { transform: translateX(0) scale(1); opacity: 1; }
    }
    .donation-content {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        flex-wrap: wrap;
    }
    .heart-icon {
        font-size: 28px;
        animation: heartBeat 0.6s ease infinite;
    }
    @keyframes heartBeat {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.3); }
    }
    .donor-name { font-weight: 800; text-transform: uppercase; letter-spacing: 1px; font-size: 16px; }
    .donation-amount { background: rgba(255,255,255,0.2); padding: 4px 14px; border-radius: 40px; font-size: 15px; display: inline-block; }
    .donation-message { font-size: 14px; font-style: italic; background: rgba(255,255,255,0.15); padding: 8px 14px; border-radius: 20px; margin-top: 8px; max-width: 300px; word-wrap: break-word; font-weight: normal; letter-spacing: normal; text-transform: none; }
    @media (max-width: 600px) {
        .donation-alert { left: 20px; right: 20px; max-width: calc(100% - 40px); padding: 12px 18px; }
        .donation-content { gap: 8px; font-size: 14px; }
        .donation-message { font-size: 12px; max-width: 200px; }
    }
`;
document.head.appendChild(styleInject);