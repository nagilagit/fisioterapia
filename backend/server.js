
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

// Configuração de ambiente
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: [
            "https://nagilalima.site",
            "http://localhost:5500",
            "http://127.0.0.1:5500",
            "http://localhost:3000",
            "http://192.168.0.2:5500",
            "http://192.168.0.2:3000",
            "https://api.nagilalima.site"
        ],
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// ============================================
// CONFIGURAÇÕES
// ============================================
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://api.nagilalima.site';

// ============================================
// LIMITES
// ============================================
const MAX_NAME_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 200;
const TIMEOUT_CREATE_PAYMENT = 30000; // 30 segundos
const TIMEOUT_CHECK_PAYMENT = 10000;  // 10 segundos
const TIMEOUT_WEBHOOK = 5000;         // 5 segundos

if (!MERCADOPAGO_ACCESS_TOKEN) {
    console.error('❌ ERRO: MERCADOPAGO_ACCESS_TOKEN não configurado no arquivo .env');
    console.error('   Adicione: MERCADOPAGO_ACCESS_TOKEN=seu_token_aqui');
    process.exit(1);
}

console.log(`✅ Token Mercado Pago carregado`);
console.log(`✅ Webhook URL configurada: ${WEBHOOK_URL}/api/pix-webhook`);
console.log(`📋 Limites: Nome=${MAX_NAME_LENGTH}, Mensagem=${MAX_MESSAGE_LENGTH}`);
console.log(`⏱️ Timeouts: Criar=${TIMEOUT_CREATE_PAYMENT/1000}s, Verificar=${TIMEOUT_CHECK_PAYMENT/1000}s, Webhook=${TIMEOUT_WEBHOOK/1000}s`);

const MERCADOPAGO_API_URL = 'https://api.mercadopago.com/v1';

let donorCount = 0;
let processedPayments = new Set();
let donationsList = [];
let pendingPayments = [];

// ============================================
// FUNÇÃO PARA VALIDAR TAMANHO
// ============================================
function validateDonationFields(nome, mensagem) {
    const errors = [];
    
    if (nome && nome.length > MAX_NAME_LENGTH) {
        errors.push(`Nome excede ${MAX_NAME_LENGTH} caracteres (${nome.length}/${MAX_NAME_LENGTH})`);
    }
    
    if (mensagem && mensagem.length > MAX_MESSAGE_LENGTH) {
        errors.push(`Mensagem excede ${MAX_MESSAGE_LENGTH} caracteres (${mensagem.length}/${MAX_MESSAGE_LENGTH})`);
    }
    
    return errors;
}

// ============================================
// FUNÇÃO PARA LOGAR DOAÇÃO NO CONSOLE
// ============================================
function logDonation(nome, valor, metodo, mensagem, status, txid = null, isPending = false) {
    const tipo = isPending ? '⏳ DOAÇÃO PENDENTE ⏳' : '💖 NOVA DOAÇÃO RECEBIDA 💖';
    console.log('\n' + '='.repeat(60));
    console.log(tipo);
    console.log('='.repeat(60));
    console.log(`👤 Usuário:        ${nome}`);
    console.log(`💬 Mensagem:      ${mensagem || '(nenhuma mensagem)'}`);
    console.log(`💰 Valor:         ${metodo === 'PIX' ? 'R$' : 'US$'} ${valor.toFixed(2)}`);
    console.log(`📱 Método:        ${metodo}`);
    console.log(`✅ Status:        ${status}`);
    if (txid) console.log(`🆔 Transação ID:  ${txid}`);
    console.log(`📅 Data/Hora:     ${new Date().toLocaleString('pt-BR')}`);
    if (!isPending) console.log(`🙌 Total doadores: ${donorCount}`);
    console.log('='.repeat(60) + '\n');
}

// ============================================
// FUNÇÃO PARA CRIAR PAGAMENTO PIX (COM TIMEOUT)
// ============================================
async function criarPagamentoPIX(nome, valor, mensagem, email) {
    const externalRef = `DON_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    const emailPagador = email || `${nome.replace(/\s/g, '_')}_${Date.now()}@doador.com`;
    
    const paymentData = {
        transaction_amount: parseFloat(valor),
        description: `Doação Live - ${nome}`,
        payment_method_id: 'pix',
        payer: {
            email: emailPagador,
            first_name: nome.split(' ')[0] || 'Doador',
            last_name: nome.split(' ').slice(1).join(' ') || 'Live'
        },
        external_reference: externalRef,
        notification_url: `${WEBHOOK_URL}/api/pix-webhook`,
        metadata: {
            nome_doador: nome,
            mensagem_doador: mensagem || '',
            plataforma: 'nagila_live'
        }
    };
    
    console.log('📦 Criando pagamento...');
    
    const response = await axios.post(`${MERCADOPAGO_API_URL}/payments`, paymentData, {
        timeout: TIMEOUT_CREATE_PAYMENT, // ⏱️ 30 segundos
        headers: {
            'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': crypto.randomBytes(16).toString('hex')
        }
    });
    
    return response.data;
}

// ============================================
// FUNÇÃO PARA PROCESSAR DOAÇÃO APROVADA
// ============================================
function processApprovedDonation(paymentId, payment) {
    console.log(`🔄 Processando doação aprovada ${paymentId}...`);
    
    // Busca o pagamento pendente
    const pendingPayment = pendingPayments.find(p => p.id.toString() === paymentId.toString());
    
    const nomeDoacao = pendingPayment?.nome || 
                      payment.metadata?.nome_doador || 
                      payment.payer?.first_name || 
                      'Anônimo';
                      
    const mensagemDoacao = pendingPayment?.mensagem || 
                          payment.metadata?.mensagem_doador || 
                          '';
                          
    const valorDoacao = payment.transaction_amount || 0;
    
    console.log(`✅ DOAÇÃO CONFIRMADA:`);
    console.log(`   Nome: ${nomeDoacao}`);
    console.log(`   Valor: R$ ${valorDoacao}`);
    console.log(`   Mensagem: ${mensagemDoacao}`);
    
    // Marca como processado
    processedPayments.add(paymentId.toString());
    donorCount++;
    
    // Remove da lista de pendentes
    const index = pendingPayments.findIndex(p => p.id.toString() === paymentId.toString());
    if (index !== -1) {
        pendingPayments.splice(index, 1);
        console.log(`🗑️ Pagamento ${paymentId} removido da lista de pendentes`);
    }
    
    // Adiciona à lista de confirmados
    donationsList.unshift({
        id: donorCount,
        nome: nomeDoacao,
        valor: valorDoacao,
        metodo: 'PIX',
        mensagem: mensagemDoacao,
        payment_id: paymentId,
        status: 'approved',
        timestamp: new Date()
    });
    
    if (donationsList.length > 50) donationsList.pop();
    
    // Log da doação
    logDonation(
        nomeDoacao,
        valorDoacao,
        'PIX',
        mensagemDoacao,
        'Pagamento confirmado ✅',
        paymentId,
        false
    );
    
    // EMITE O EVENTO VIA WEBSOCKET
    const eventData = {
        nome: nomeDoacao,
        valor: valorDoacao,
        metodo: 'PIX',
        mensagem: mensagemDoacao,
        donorCount: donorCount,
        status: 'Pagamento confirmado ✅',
        timestamp: new Date().toISOString(),
        origem: 'externa'  // <-- NOVO: identifica que veio da página externa
    };
    
    console.log(`📡 Emitindo 'nova-doacao' para todos os clientes...`);
    io.emit('nova-doacao', eventData);
    
    console.log(`✅ Doação de ${nomeDoacao} (R$ ${valorDoacao}) confirmada e notificada!`);
    console.log(`🙌 Total de doadores: ${donorCount}`);
}

// ============================================
// ENDPOINT: CRIAR PAGAMENTO PIX (COM VALIDAÇÃO E TIMEOUT)
// ============================================
app.post('/api/create-pix-payment', async (req, res) => {
    const { nome, valor, mensagem, email } = req.body;
    
    console.log('\n🔵 NOVO PAGAMENTO PIX');
    console.log(`   Nome: ${nome}`);
    console.log(`   Valor: R$ ${valor}`);
    console.log(`   Mensagem: ${mensagem || '(nenhuma)'}`);
    
    // ============================================
    // VALIDAÇÕES DE TAMANHO
    // ============================================
    if (!valor || valor < 1) {
        return res.status(400).json({ error: 'Valor mínimo R$ 1' });
    }
    
    const errors = validateDonationFields(nome, mensagem);
    if (errors.length > 0) {
        return res.status(400).json({ error: errors.join('. ') });
    }
    
    try {
        const payment = await criarPagamentoPIX(nome, valor, mensagem, email);
        
        console.log(`📨 Resposta MP: ID ${payment.id}, Status ${payment.status}`);
        
        if (payment.status === 'pending') {
            const qrCodeBase64 = payment.point_of_interaction?.transaction_data?.qr_code_base64;
            const qrCodeText = payment.point_of_interaction?.transaction_data?.qr_code;
            
            if (!qrCodeBase64) {
                throw new Error('QR Code não retornado');
            }
            
            // SALVA NA LISTA DE PENDENTES
            const pendingPayment = {
                id: payment.id,
                nome: nome || 'Anônimo',
                valor: parseFloat(valor),
                mensagem: mensagem || '',
                metodo: 'PIX',
                status: 'pending',
                qrCodeBase64: qrCodeBase64,
                qrCodeText: qrCodeText,
                timestamp: new Date()
            };
            
            pendingPayments.unshift(pendingPayment);
            
            console.log(`✅ Pagamento criado: ${payment.id}`);
            console.log(`📋 Pendentes: ${pendingPayments.length}`);
            
            logDonation(
                pendingPayment.nome,
                pendingPayment.valor,
                'PIX',
                pendingPayment.mensagem,
                'Aguardando pagamento PIX... ⏳',
                payment.id,
                true
            );
            
            res.json({
                success: true,
                payment_id: payment.id,
                qr_code_base64: qrCodeBase64,
                qr_code: qrCodeText,
                status: payment.status,
                external_reference: payment.external_reference
            });
        } else {
            throw new Error(`Status inesperado: ${payment.status}`);
        }
        
    } catch (error) {
        // ============================================
        // TRATAMENTO DE TIMEOUT
        // ============================================
        if (error.code === 'ECONNABORTED') {
            console.error('⏱️ TIMEOUT: Mercado Pago demorou para responder');
            return res.status(504).json({ 
                error: 'O Mercado Pago está demorando para responder. Tente novamente.' 
            });
        }
        
        console.error('❌ Erro ao criar pagamento:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Erro ao processar doação: ' + (error.response?.data?.message || error.message) 
        });
    }
});

// ============================================
// ENDPOINT: WEBHOOK DO MERCADO PAGO (COM TIMEOUT)
// ============================================
app.post('/api/pix-webhook', async (req, res) => {
    const webhookData = req.body;
    
    console.log('\n📥 WEBHOOK RECEBIDO');
    
    // Extrai o payment_id de diferentes formatos
    let paymentId = null;
    
    if (webhookData.data?.id) {
        paymentId = webhookData.data.id;
    } else if (webhookData.id) {
        paymentId = webhookData.id;
    }
    
    if (!paymentId) {
        console.log('⚠️ Sem payment_id, ignorando');
        return res.status(200).json({ success: true });
    }
    
    // Evita processamento duplicado
    if (processedPayments.has(paymentId.toString())) {
        console.log(`⏭️ Pagamento ${paymentId} já processado`);
        return res.status(200).json({ success: true });
    }
    
    try {
        // Consulta o pagamento no Mercado Pago (COM TIMEOUT)
        const response = await axios.get(`${MERCADOPAGO_API_URL}/payments/${paymentId}`, {
            timeout: TIMEOUT_WEBHOOK, // ⏱️ 5 segundos
            headers: { 
                'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`
            }
        });
        
        const payment = response.data;
        console.log(`Status do pagamento ${paymentId}: ${payment.status}`);
        
        // SÓ PROCESSA SE FOR APROVADO
        if (payment.status === 'approved') {
            processApprovedDonation(paymentId, payment);
        } else {
            console.log(`⏸️ Pagamento ${paymentId} não aprovado ainda: ${payment.status}`);
        }
        
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.error(`⏱️ TIMEOUT no webhook: ${paymentId}`);
        } else {
            console.error('❌ Erro no webhook:', error.message);
            if (error.response) {
                console.error('Detalhes:', error.response.data);
            }
        }
    }
    
    // SEMPRE RESPONDE 200
    res.status(200).json({ success: true });
});

// ============================================
// ENDPOINT: VERIFICAR PAGAMENTO (COM TIMEOUT)
// ============================================
app.get('/api/check-payment/:paymentId', async (req, res) => {
    const { paymentId } = req.params;
    
    console.log(`🔍 Verificando pagamento ${paymentId}...`);
    
    // JÁ FOI PROCESSADO?
    if (processedPayments.has(paymentId.toString())) {
        console.log(`✅ Pagamento ${paymentId} já confirmado`);
        return res.json({ paid: true, status: 'approved' });
    }
    
    try {
        // CONSULTA DIRETO NO MERCADO PAGO (COM TIMEOUT)
        const response = await axios.get(`${MERCADOPAGO_API_URL}/payments/${paymentId}`, {
            timeout: TIMEOUT_CHECK_PAYMENT, // ⏱️ 10 segundos
            headers: { 
                'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`
            }
        });
        
        const payment = response.data;
        console.log(`Status atual: ${payment.status}`);
        
        if (payment.status === 'approved') {
            // PROCESSA A DOAÇÃO AQUI TAMBÉM
            processApprovedDonation(paymentId, payment);
            return res.json({ paid: true, status: 'approved' });
        }
        
        res.json({ paid: false, status: payment.status });
        
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.error(`⏱️ TIMEOUT ao verificar: ${paymentId}`);
            return res.json({ paid: false, status: 'timeout' });
        }
        console.error('❌ Erro ao verificar:', error.message);
        res.json({ paid: false, status: 'error' });
    }
});

// ============================================
// ENDPOINT: SIMULAR DOAÇÃO (COM VALIDAÇÃO)
// ============================================
app.post('/api/simulate-donation', async (req, res) => {
    const { nome, valor, metodo, mensagem } = req.body;
    
    console.log('\n🧪 SIMULAÇÃO DE DOAÇÃO (TESTE)');
    console.log(`   Nome: ${nome}`);
    console.log(`   Valor: ${metodo === 'PIX' ? 'R$' : 'US$'} ${valor}`);
    console.log(`   Mensagem: ${mensagem || '(nenhuma)'}`);
    
    // ============================================
    // VALIDAÇÕES DE TAMANHO
    // ============================================
    const errors = validateDonationFields(nome, mensagem);
    if (errors.length > 0) {
        return res.status(400).json({ error: errors.join('. ') });
    }
    
    donorCount++;
    
    logDonation(
        nome || 'Anônimo',
        valor,
        metodo || 'PayPal',
        mensagem || '',
        'Simulado para teste ✅',
        null,
        false
    );
    
    donationsList.unshift({
        id: donorCount,
        nome: nome || 'Anônimo',
        valor: valor,
        metodo: metodo || 'PayPal',
        mensagem: mensagem || '',
        status: 'simulated',
        timestamp: new Date()
    });
    
    io.emit('nova-doacao', {
        nome: nome || 'Anônimo',
        valor: valor,
        metodo: metodo || 'PayPal',
        mensagem: mensagem || '',
        donorCount: donorCount,
        status: 'Simulado ✅',
        timestamp: new Date()
    });
    
    res.json({ success: true, donorCount });
});

// ============================================
// ENDPOINT: REGISTRAR DOAÇÃO PENDENTE (COM VALIDAÇÃO)
// ============================================
app.post('/api/pending-donation', async (req, res) => {
    const { nome, valor, metodo, mensagem, status } = req.body;
    
    console.log('\n📝 Registrando doação pendente...');
    
    // ============================================
    // VALIDAÇÕES DE TAMANHO
    // ============================================
    const errors = validateDonationFields(nome, mensagem);
    if (errors.length > 0) {
        return res.status(400).json({ error: errors.join('. ') });
    }
    
    const pendingDonation = {
        id: Date.now(),
        nome: nome || 'Anônimo',
        valor: valor,
        metodo: metodo || 'PIX',
        mensagem: mensagem || '',
        status: status || 'Aguardando pagamento... ⏳',
        timestamp: new Date()
    };
    
    pendingPayments.unshift(pendingDonation);
    
    logDonation(
        pendingDonation.nome,
        pendingDonation.valor,
        pendingDonation.metodo,
        pendingDonation.mensagem,
        pendingDonation.status,
        null,
        true
    );
    
    res.json({ success: true, donation: pendingDonation });
});

// ============================================
// ENDPOINT: RANKING DE DOADORES
// ============================================
app.get('/api/donor-ranking', (req, res) => {
    const ranking = donationsList
        .reduce((acc, don) => {
            const existing = acc.find(d => d.nome === don.nome);
            if (existing) {
                existing.total += don.valor;
                existing.count++;
            } else {
                acc.push({ nome: don.nome, total: don.valor, count: 1 });
            }
            return acc;
        }, [])
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    
    res.json({ ranking });
});

// ============================================
// ENDPOINTS DE CONSULTA
// ============================================
app.get('/api/donation-stats', (req, res) => {
    res.json({
        donorCount: donorCount,
        recentDonations: donationsList.slice(0, 10),
        pendingDonations: pendingPayments.slice(0, 5)
    });
});

app.get('/api/pending-donations', (req, res) => {
    res.json({ pending: pendingPayments });
});

app.get('/api/all-donations', (req, res) => {
    res.json({
        total: donorCount,
        confirmed: donationsList,
        pending: pendingPayments
    });
});

// ============================================
// ENDPOINT: RESETAR CONTADOR
// ============================================
app.post('/api/reset-counter', (req, res) => {
    const { password } = req.body;
    if (password === 'admin123') {
        donorCount = 0;
        processedPayments.clear();
        donationsList = [];
        pendingPayments = [];
        console.log('\n⚠️ CONTADOR RESETADO ⚠️\n');
        res.json({ success: true, donorCount: 0 });
    } else {
        res.status(401).json({ error: 'Senha inválida' });
    }
});

// ============================================
// ENDPOINT: HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        donorCount: donorCount,
        pendingPayments: pendingPayments.length,
        processedPayments: processedPayments.size
    });
});

// ============================================
// WEBSOCKET
// ============================================
io.on('connection', (socket) => {
    console.log('🎥 Cliente conectado à live:', socket.id);
    
    socket.emit('status-inicial', {
        donorCount: donorCount,
        recentDonations: donationsList.slice(0, 5)
    });
    
    console.log(`📊 Status enviado para ${socket.id}: ${donorCount} doadores no total`);
    
    socket.on('disconnect', () => {
        console.log('❌ Cliente desconectado:', socket.id);
    });
});

// ============================================
// TRATAMENTO DE ERROS
// ============================================
process.on('uncaughtException', (error) => {
    console.error('🔥 Erro não tratado:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('🔥 Promessa rejeitada não tratada:', error);
});

// ============================================
// INICIA O SERVIDOR
// ============================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log(`🚀 SERVIDOR LIVE PIX - MERCADO PAGO`);
    console.log('='.repeat(50));
    console.log(`📡 Porta:        ${PORT}`);
    console.log(`🙌 Doadores:     ${donorCount}`);
    console.log(`🌐 WebSocket:    ws://localhost:${PORT}`);
    console.log(`🔗 URL Pública:  ${WEBHOOK_URL}`);
    console.log(`📋 Limites:`);
    console.log(`   Máx Nome:     ${MAX_NAME_LENGTH} caracteres`);
    console.log(`   Máx Mensagem: ${MAX_MESSAGE_LENGTH} caracteres`);
    console.log(`⏱️ Timeouts:`);
    console.log(`   Criar PIX:    ${TIMEOUT_CREATE_PAYMENT/1000}s`);
    console.log(`   Verificar:    ${TIMEOUT_CHECK_PAYMENT/1000}s`);
    console.log(`   Webhook:      ${TIMEOUT_WEBHOOK/1000}s`);
    console.log(`📍 Endpoints disponíveis:`);
    console.log(`   POST   /api/create-pix-payment  - Criar pagamento PIX`);
    console.log(`   POST   /api/pix-webhook         - Webhook MP`);
    console.log(`   GET    /api/check-payment/:id   - Verificar status`);
    console.log(`   GET    /api/donation-stats      - Estatísticas`);
    console.log(`   GET    /api/donor-ranking       - Ranking de doadores`);
    console.log(`   GET    /health                  - Health check`);
    console.log(`   POST   /api/simulate-donation   - Simular doação (teste)`);
    console.log('='.repeat(50) + '\n');
});
