// broker.js

// 1. IMPORTAÇÃO DE BIBLIOTECAS
require('dotenv').config(); // Carrega as variáveis do arquivo .env
const aedes = require('aedes')(); // Cria a instância do Aedes Broker
const net = require('net'); // Módulo nativo para criar o servidor TCP
const { Client } = require('pg'); // Cliente PostgreSQL

// 2. CONFIGURAÇÕES
const HOST = process.env.DNS || '127.0.0.1'; // Pega do .env, ou usa localhost como fallback
const PORT = parseInt(process.env.PORTA) || 1883; // Porta MQTT padrão

// Usuário e Senha requeridos pelo seu pedido
const USUARIO_REQUERIDO = 'lupa';
const SENHA_REQUERIDA = 'lupa';
const TOPICO_MONITORADO = 'teste';

// Configuração do PostgreSQL
const pgClient = new Client({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'mqtt_db',
});

// Conecta ao PostgreSQL
pgClient.connect((err) => {
    if (err) {
        console.error('[DB ERROR] Erro ao conectar ao PostgreSQL:', err);
    } else {
        console.log('[DB OK] Conectado ao PostgreSQL com sucesso!');
    }
});

// 3. LÓGICA DE AUTENTICAÇÃO (Usuario/Senha)
aedes.authenticate = (client, username, password, callback) => {
    // Verifica se o usuário e senha correspondem aos valores fixos
    console.log(`\n[AUTH] Tentativa de autenticação do Cliente ID ${client.id} com Usuário: ${username}`);
    if (username === USUARIO_REQUERIDO && password.toString() === SENHA_REQUERIDA) {
        console.log(`\n[AUTH] Cliente ID ${client.id} autenticado como ${username}.`);
        callback(null, true); // Autenticação bem-sucedida
    } else {
        console.log(`\n[AUTH FAIL] Tentativa falha de ${username} (Senha: ${password.toString()}).`);
        const error = new Error('Usuário ou senha inválidos.');
        error.returnCode = 4; // Código de erro MQTT para Autenticação
        callback(error, false); // Autenticação falha
    }
};

// 4. LÓGICA DE RECEBIMENTO DE MENSAGENS E IMPRESSÃO
aedes.on('publish', (packet, client) => {
    // O evento 'publish' é disparado quando alguém publica uma mensagem.
    
    // Verifica se a mensagem veio de um cliente (não é interna do Broker)
    if (client) {
        const topic = packet.topic;
        const payloadStr = packet.payload.toString();
        let payload;
        
        try {
            payload = JSON.parse(payloadStr);
        } catch (e) {
            payload = payloadStr;
        }

        if (topic === TOPICO_MONITORADO) {
            console.log('----------------------------------------------------');
            console.log(`[PUBLICADO] Tópico: ${topic}`);
            console.log(`[PUBLICADO] Payload (Mensagem):`, payload);
            console.log(`[PUBLICADO] Cliente Origem: ${client.id}`);
            console.log('----------------------------------------------------');

            // Salva no PostgreSQL
            const query = 'INSERT INTO mqtt_messages (topic, payload, client_id) VALUES ($1, $2, $3)';
            const values = [topic, JSON.stringify(payload), client.id];

            pgClient.query(query, values, (err, result) => {
                if (err) {
                    console.error('[DB ERROR] Erro ao salvar mensagem:', err);
                } else {
                    console.log('[DB OK] Mensagem salva com ID:', result.rows[0]?.id || 'N/A');
                }
            });
        } else {
            console.log(`[INFO] Mensagem no tópico não monitorado: ${topic}`);
        }
    }
});

// 5. CRIAÇÃO E INICIALIZAÇÃO DO SERVIDOR TCP
const server = net.createServer(aedes.handle);

server.listen(PORT, HOST, function () {
    console.log('====================================================');
    console.log(`🚀 Broker MQTT Aedes rodando!`);
    console.log(`🔗 Acessível em: mqtt://${HOST}:${PORT}`);
    console.log(`🔑 Autenticação: Usuário/Senha = ${USUARIO_REQUERIDO}/${SENHA_REQUERIDA}`);
    console.log(`👂 Monitorando Tópico: ${TOPICO_MONITORADO}`);
    console.log('====================================================');
});