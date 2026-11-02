const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const FAKE_BALANCE = '0x' + (1000n * 10n ** 6n).toString(16).padStart(64, '0');
const USDT_CONTRACT = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const REAL_RPC = 'https://ethereum-rpc.publicnode.com';

app.post('/', async (req, res) => {
  const { method, params, id } = req.body;

  if (method === 'eth_call') {
    const call = params[0];
    if (call.to && call.to.toLowerCase() === USDT_CONTRACT && call.data && call.data.startsWith('0x70a08231')) {
      return res.json({ jsonrpc: '2.0', id, result: FAKE_BALANCE });
    }
  }

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
  console.log(`Faux RPC en écoute sur le port ${PORT}`);
});
