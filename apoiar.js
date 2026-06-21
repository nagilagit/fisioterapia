/* ============================================
   CONFIGURAÇÕES
   ============================================ */
const BACKEND_URL = 'https://api.nagilalima.site';
const MAX_NAME_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 200;

let socket = null;
let donorCount = 0;
let currentPaymentId = null;
let paymentCheckInterval = null;
let isGenerating = false;

/* ============================================
   DOM REFERÊNCIAS
   ============================================ */
const form = document.getElementById('donationForm');
const donorName = document.getElementById('donorName');
const donorMessage = document.getElementById('donorMessage');
const donationValue = document.getElementById('donationValue');
const generateBtn = document.getElementById('generateBtn');
const qrArea = document.getElementById('qrArea');
const qrContainer = document.getElementById('qrCode');
const qrLoader = document.getElementById('qrLoader');
const pixCodeText = document.getElementById('pixCodeText');
const pixCodeBox = document.getElementById('pixCodeBox');
const copyPixBtn = document.getElementById('copyPixBtn');
const paymentStatus = document.getElementById('paymentStatus');
const donorCountEl = document.getElementById('donorCount');
const successToast = document.getElementById('successToast');
const errorToast = document.getElementById('errorToast');
const errorMessage = document.getElementById('errorMessage');
const loadingOverlay = document.getElementById('loadingOverlay');
const regenerateBtn = document.getElementById('regenerateBtn');
const nameCounter = document.getElementById('nameCounter');
const messageCounter = document.getElementById('messageCounter');
const copyFeedback = document.getElementById('copyFeedback');
const submitFeedback = document.getElementById('submitFeedback');
const nameHint = document.getElementById('nameHint');
const messageHint = document.getElementById('messageHint');

/* ============================================
   FUNÇÕES DE UI - FEEDBACKS
   ============================================ */

// Mostrar feedback de cópia
function showCopyFeedback() {
    copyFeedback.classList.remove('hide');
    copyFeedback.classList.add('show');
    copyFeedback.style.display = 'flex';
    
    setTimeout(() => {
        copyFeedback.classList.remove('show');
        copyFeedback.classList.add('hide');
        setTimeout(() => {
            copyFeedback.style.display = 'none';
        }, 300);
    }, 1500);
}

// Mostrar feedback de submit
function showSubmitFeedback(message, isSuccess = true) {
    const icon = submitFeedback.querySelector('.submit-icon');
    const text = submitFeedback.querySelector('.submit-text');
    
    icon.textContent = isSuccess ? '✅' : '❌';
    text.innerHTML = isSuccess 
        ? `${message || 'QR Code gerado com sucesso!'} <small>O código PIX está pronto para uso</small>`
        : `${message || 'Erro ao gerar QR Code'} <small>Tente novamente</small>`;
    
    submitFeedback.classList.add('show');
    
    setTimeout(() => {
        submitFeedback.classList.remove('show');
    }, isSuccess ? 2500 : 3500);
}

// Mostrar toast de sucesso
function showSuccessToast() {
    successToast.style.display = 'flex';
    successToast.style.animation = 'slideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    setTimeout(() => {
        successToast.style.animation = 'slideOut 0.4s ease';
        setTimeout(() => {
            successToast.style.display = 'none';
        }, 400);
    }, 4000);
}

// Mostrar toast de erro
function showErrorToast(message) {
    errorMessage.textContent = message || 'Algo deu errado. Tente novamente.';
    errorToast.style.display = 'flex';
    errorToast.style.animation = 'slideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    setTimeout(() => {
        errorToast.style.animation = 'slideOut 0.4s ease';
        setTimeout(() => {
            errorToast.style.display = 'none';
        }, 400);
    }, 4000);
}

// Mostrar loading
function showLoading(show) {
    loadingOverlay.classList.toggle('active', show);
}

// Atualizar contador
function updateDonorCounter(count) {
    donorCount = count || 0;
    donorCountEl.textContent = donorCount;
    donorCountEl.classList.remove('pop');
    void donorCountEl.offsetWidth;
    donorCountEl.classList.add('pop');
}

// Atualizar status do pagamento
function updatePaymentStatus(status, message) {
    const dot = paymentStatus.querySelector('.status-dot');
    const text = paymentStatus.querySelector('.status-text');
    
    paymentStatus.className = 'payment-status';
    
    if (status === 'pending') {
        dot.className = 'status-dot pending';
        text.textContent = message || 'Aguardando pagamento...';
    } else if (status === 'success') {
        dot.className = 'status-dot success';
        text.textContent = message || 'Pagamento confirmado! 🎉';
        paymentStatus.classList.add('success');
    } else if (status === 'error') {
        dot.className = 'status-dot error';
        text.textContent = message || 'Erro ao verificar pagamento';
        paymentStatus.classList.add('error');
    }
}

// Atualizar contador de caracteres com feedback
function updateCharCounter(input, counter, max, hint) {
    const length = input.value.length;
    const remaining = max - length;
    counter.textContent = `${length}/${max}`;
    counter.classList.remove('warning', 'danger');
    
    if (remaining <= 10 && remaining > 3) {
        counter.classList.add('warning');
        if (hint) {
            hint.textContent = `⚠️ ${remaining} caracteres restantes`;
            hint.style.color = '#f59e0b';
        }
    } else if (remaining <= 3) {
        counter.classList.add('danger');
        if (hint) {
            hint.textContent = `❗ ${remaining} caracteres restantes`;
            hint.style.color = '#ef4444';
        }
    } else {
        if (hint) {
            hint.textContent = `✔️ ${remaining} caracteres disponíveis`;
            hint.style.color = '#10b981';
        }
    }
}

/* ============================================
   FUNÇÕES DE QR CODE
   ============================================ */

function displayQRCode(base64Data) {
    qrContainer.innerHTML = '';
    const img = document.createElement('img');
    img.src = `data:image/png;base64,${base64Data}`;
    img.alt = 'QR Code PIX';
    img.loading = 'lazy';
    qrContainer.appendChild(img);
    qrLoader.classList.remove('active');
}

function displayPixCode(code) {
    pixCodeText.textContent = code;
}

function copyPixCode() {
    const code = pixCodeText.textContent;
    if (!code || code === 'Carregando...') return;
    
    navigator.clipboard.writeText(code).then(() => {
        copyPixBtn.classList.add('copied');
        copyPixBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Copiado!</span>
        `;
        showCopyFeedback();
        setTimeout(() => {
            copyPixBtn.classList.remove('copied');
            copyPixBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                <span>Copiar</span>
            `;
        }, 2000);
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        copyPixBtn.classList.add('copied');
        copyPixBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Copiado!</span>
        `;
        showCopyFeedback();
        setTimeout(() => {
            copyPixBtn.classList.remove('copied');
            copyPixBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                <span>Copiar</span>
            `;
        }, 2000);
    });
}

/* ============================================
   FUNÇÕES DE API
   ============================================ */

async function createPixPayment(nome, valor, mensagem) {
    const response = await fetch(`${BACKEND_URL}/api/create-pix-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, valor, mensagem })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar pagamento');
    }
    
    return await response.json();
}

async function checkPayment(paymentId) {
    const response = await fetch(`${BACKEND_URL}/api/check-payment/${paymentId}`);
    return await response.json();
}

async function registerPendingDonation(nome, valor, mensagem) {
    await fetch(`${BACKEND_URL}/api/pending-donation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nome: nome || 'Anônimo',
            valor,
            metodo: 'PIX',
            mensagem: mensagem || '',
            status: 'Aguardando pagamento PIX... ⏳'
        })
    });
}

/* ============================================
   FUNÇÃO PRINCIPAL - GERAR PIX
   ============================================ */
async function handleGeneratePix(e) {
    e.preventDefault();
    
    if (isGenerating) return;
    
    const nome = donorName.value.trim();
    const mensagem = donorMessage.value.trim();
    const valor = parseFloat(donationValue.value);
    
    if (isNaN(valor) || valor < 1) {
        showErrorToast('Valor mínimo é R$ 1,00');
        return;
    }
    
    if (nome.length > MAX_NAME_LENGTH) {
        showErrorToast(`Nome excede ${MAX_NAME_LENGTH} caracteres`);
        return;
    }
    
    if (mensagem.length > MAX_MESSAGE_LENGTH) {
        showErrorToast(`Mensagem excede ${MAX_MESSAGE_LENGTH} caracteres`);
        return;
    }
    
    isGenerating = true;
    generateBtn.disabled = true;
    generateBtn.querySelector('.btn-content').innerHTML = `
        <span class="btn-icon">⏳</span>
        <span class="btn-text">Gerando...</span>
    `;
    
    showLoading(true);
    
    try {
        const data = await createPixPayment(nome, valor, mensagem);
        
        if (!data.success || !data.qr_code_base64) {
            throw new Error(data.error || 'Erro ao gerar QR Code');
        }
        
        currentPaymentId = data.payment_id;
        
        qrArea.style.display = 'block';
        qrLoader.classList.add('active');
        displayQRCode(data.qr_code_base64);
        displayPixCode(data.qr_code);
        
        updatePaymentStatus('pending');
        
        await registerPendingDonation(nome, valor, mensagem);
        
        // Feedback de sucesso
        showSubmitFeedback('QR Code gerado com sucesso!', true);
        
        if (paymentCheckInterval) {
            clearInterval(paymentCheckInterval);
        }
        paymentCheckInterval = setInterval(() => {
            verifyPayment(currentPaymentId);
        }, 5000);
        
        setTimeout(() => {
            qrArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 500);
        
    } catch (error) {
        console.error('❌ Erro ao gerar PIX:', error);
        showSubmitFeedback(error.message || 'Erro ao gerar pagamento', false);
        showErrorToast(error.message || 'Erro ao gerar pagamento. Tente novamente.');
        qrArea.style.display = 'none';
    } finally {
        isGenerating = false;
        generateBtn.disabled = false;
        generateBtn.querySelector('.btn-content').innerHTML = `
            <span class="btn-icon">✨</span>
            <span class="btn-text">Gerar QR Code PIX</span>
        `;
        showLoading(false);
    }
}

/* ============================================
   VERIFICAR PAGAMENTO
   ============================================ */
async function verifyPayment(paymentId) {
    try {
        const data = await checkPayment(paymentId);
        
        if (data.paid === true) {
            clearInterval(paymentCheckInterval);
            paymentCheckInterval = null;
            
            updatePaymentStatus('success', 'Pagamento confirmado! 🎉');
            showSuccessToast();
            regenerateBtn.style.display = 'block';
        }
    } catch (error) {
        console.error('❌ Erro ao verificar pagamento:', error);
    }
}

/* ============================================
   RE-GERAR QR CODE
   ============================================ */
function handleRegenerate() {
    if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval);
        paymentCheckInterval = null;
    }
    currentPaymentId = null;
    qrArea.style.display = 'none';
    updatePaymentStatus('pending', '');
    donationValue.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================
   WEBSOCKET
   ============================================ */
function connectWebSocket() {
    socket = io(BACKEND_URL, {
        transports: ['websocket'],
        autoConnect: true
    });
    
    socket.on('connect', () => {
        console.log('🟢 Conectado ao servidor WebSocket');
    });
    
    socket.on('status-inicial', (data) => {
        updateDonorCounter(data.donorCount || 0);
    });
    
    socket.on('nova-doacao', (doacao) => {
        updateDonorCounter(doacao.donorCount);
        
        if (currentPaymentId) {
            updatePaymentStatus('success', 'Pagamento confirmado! 🎉');
            if (paymentCheckInterval) {
                clearInterval(paymentCheckInterval);
                paymentCheckInterval = null;
            }
            regenerateBtn.style.display = 'block';
            showSuccessToast();
        }
    });
    
    socket.on('disconnect', () => {
        console.log('🔴 Desconectado. Reconectando...');
        setTimeout(connectWebSocket, 3000);
    });
}

/* ============================================
   EVENT LISTENERS
   ============================================ */

form.addEventListener('submit', handleGeneratePix);

document.querySelectorAll('.quick-value').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.quick-value').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        donationValue.value = this.dataset.value;
        // Feedback visual
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = '';
        }, 150);
    });
});

document.querySelectorAll('.value-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const change = parseInt(this.dataset.change);
        let current = parseInt(donationValue.value) || 0;
        let newValue = current + change;
        if (newValue < 1) newValue = 1;
        donationValue.value = newValue;
        
        document.querySelectorAll('.quick-value').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.value) === newValue);
        });
    });
});

donationValue.addEventListener('input', function() {
    let val = parseInt(this.value) || 0;
    if (val < 1) this.value = 1;
    
    document.querySelectorAll('.quick-value').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.value) === parseInt(this.value));
    });
});

donorName.addEventListener('input', function() {
    updateCharCounter(this, nameCounter, MAX_NAME_LENGTH, nameHint);
});

donorMessage.addEventListener('input', function() {
    updateCharCounter(this, messageCounter, MAX_MESSAGE_LENGTH, messageHint);
});

copyPixBtn.addEventListener('click', copyPixCode);

pixCodeBox.addEventListener('click', function(e) {
    if (e.target === copyPixBtn || copyPixBtn.contains(e.target)) return;
    copyPixCode();
});

regenerateBtn.addEventListener('click', handleRegenerate);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        successToast.style.display = 'none';
        errorToast.style.display = 'none';
        submitFeedback.classList.remove('show');
        copyFeedback.style.display = 'none';
    }
});

// Fechar feedback de submit ao clicar fora
submitFeedback.addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.remove('show');
    }
});

/* ============================================
   INICIALIZAÇÃO
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
    connectWebSocket();
    updateCharCounter(donorName, nameCounter, MAX_NAME_LENGTH, nameHint);
    updateCharCounter(donorMessage, messageCounter, MAX_MESSAGE_LENGTH, messageHint);
    
    if (parseInt(donationValue.value) < 1) {
        donationValue.value = 10;
    }
    
    console.log('💖 Página de doações PIX carregada!');
});