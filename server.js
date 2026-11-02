const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const FAKE_BALANCE = '0x' + (1000n * 10n ** 6n).toString(16).padStart(64, '0');
const USDT_CONTRACT = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const REAL_RPC = 'https://ethereum-rpc.publicnode.com';

// ──────────────────────────────────────────────────────────────
// 1. La page HTML pour MetaMask
// ──────────────────────────────────────────────────────────────
app.get('/inject', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MetaMask Injector</title>
    <style>
      body { background: #111; color: #fff; font-family: -apple-system, sans-serif; text-align: center; padding: 20px; display: flex; justify-content: center; }
      .card { background: #1c1c1e; padding: 20px; border-radius: 16px; width: 100%; max-width: 400px; }
      h2 { margin-top: 0; }
      button { background: #f6851b; color: #fff; border: 0; padding: 16px; width: 100%; border-radius: 10px; font-size: 16px; font-weight: 600; margin-top: 15px; }
      .log { text-align: left; background: #000; padding: 10px; margin-top: 20px; font-family: monospace; font-size: 12px; color: #30d158; height: 150px; overflow-y: auto; border-radius: 8px; }
    </style>
    </head>
    <body>
    <div class="card">
      <h2>MetaMask Injector</h2>
      <p style="color:#8e8e93; font-size:14px">Connecte et lis le faux solde.</p>
      <button id="btn" onclick="connect()">1. Connecter MetaMask</button>
      <div class="log" id="log">Prêt.</div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/ethers@6.13.4/dist/ethers.umd.min.js"></script>
    <script>
      const E = ethers;
      let p, s, u;
      function l(m) {
        const el = document.getElementById('log');
        el.innerHTML += '<br>>' + m;
        el.scrollTop = el.scrollHeight;
      }
      async function connect() {
        if (window.ethereum) {
          try {
            p = new E.BrowserProvider(window.ethereum);
            await p.send("eth_requestAccounts", []);
            s = await p.getSigner();
            u = await s.getAddress();
            l('Connecté: ' + u);
            document.getElementById('btn').textContent = '2. Lire le solde USDT';
            document.getElementById('btn').onclick = read;
          } catch(e) {
            l('Erreur: ' + e.message);
          }
        } else {
          l('MetaMask non détecté. Ouvre ce lien dans le navigateur MetaMask.');
        }
      }
      async function read() {
        try {
          l('Interrogation RPC...');
          const c = new E.Contract('0xdAC17F958D2ee523a2206206994597C13D831ec7', ['function balanceOf(address) view returns (uint256)'], p);
          const b = await c.balanceOf(u);
          const f = E.formatUnits(b, 6);
          l('Réponse: ' + f + ' USDT');
          alert('Faux solde : ' + f + ' USDT');
        } catch(e) {
          l('Erreur: ' + e.message);
        }
      }
    </script>
    </body>
    </html>
  `);
});

// ──────────────────────────────────────────────────────────────
// 2. Le Faux RPC (pour les requêtes de MetaMask)
// ──────────────────────────────────────────────────────────────
app.post('/', async (req, res) => {
  const { method, params, id } = req.body;

  // Répondre au test de MetaMask
  if (method === 'eth_chainId') return res.json({ jsonrpc: '2.0', id, result: '0x1' });
  if (method === 'net_version') return res.json({ jsonrpc: '2.0', id, result: '1' });

  // Intercepter le solde USDT
  if (method === 'eth_call') {
    const call = params[0];
    if (call.to && call.to.toLowerCase() === USDT_CONTRACT && call.data && call.data.startsWith('0x70a08231')) {
      console.log('>>> Faux solde renvoyé !');
      return res.json({ jsonrpc: '2.0', id, result: FAKE_BALANCE });
    }
  }

  // Relayer tout le reste au vrai réseau Ethereum
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
