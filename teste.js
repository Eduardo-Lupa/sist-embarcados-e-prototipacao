// cliente_teste.js
const mqtt = require('mqtt');

// Use o IP LOCAL do seu PC (127.0.0.1) ou o seu IP 192.168.0.X
const host = '192.168.0.126'; 
const port = '1883';

const options = {
  port: port,
  clientId: 'NodeClient',
  username: 'lupa', // Seu usuário
  password: 'lupa'  // Sua senha
};

const client = mqtt.connect(`mqtt://${host}`, options);

client.on('connect', function () {
  console.log('✅ Cliente conectado com sucesso ao Broker Aedes!');
  client.subscribe('teste', function (err) {
    if (!err) {
      console.log('✅ Cliente inscrito no tópico "teste"');
    }
  });
  client.publish('teste', 'Mensagem de teste do cliente Node!');
});

client.on('error', function (err) {
  console.log(`❌ Erro de conexão do cliente: ${err.message}`);
  client.end();
});