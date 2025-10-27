const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

const {
  WHATSAPP_GROUP_SOURCE = '',
  WHATSAPP_GROUP_TARGETS = '',
  TRIGGER = '#publicar',
  SEND_DELAY_MS = '1500',
  MAX_GROUPS_PER_BATCH = '5',
  BATCH_PAUSE_MS = '12000',
  RETRY_ATTEMPTS = '2',
  RETRY_BACKOFF_MS = '2500',
  JITTER_MS = '500',
  LIST_GROUPS = '0'
} = process.env;

// Normalizar numéricos
const N_SEND_DELAY_MS = Number(SEND_DELAY_MS);
const N_MAX_GROUPS_PER_BATCH = Number(MAX_GROUPS_PER_BATCH);
const N_BATCH_PAUSE_MS = Number(BATCH_PAUSE_MS);
const N_RETRY_ATTEMPTS = Number(RETRY_ATTEMPTS);
const N_RETRY_BACKOFF_MS = Number(RETRY_BACKOFF_MS);
const N_JITTER_MS = Number(JITTER_MS);

let isReady = false;

// Utilidad para esperas
const wait = (ms) => new Promise(res => setTimeout(res, ms));
const withJitter = (ms) => ms + Math.floor(Math.random() * N_JITTER_MS);

// ---- Cliente WhatsApp (con fix de LocalWebCache usando versión remota) ----
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './session',
    restartOnAuthFail: false,
    takeoverOnConflict: false
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-zygote'
    ]
  },
  // Soluciona el fallo TypeError en LocalWebCache
  webVersionCache: {
    type: 'remote',
    // Puedes cambiar a otra versión estable listada por WPPConnect si fuera necesario
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
  }
});

console.log('🚀 Iniciando bot…');

client.on('qr', (qr) => {
  console.log('📲 Escaneá este QR con tu WhatsApp (Dispositivos vinculados):');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('✅ Autenticado correctamente');
});

client.on('auth_failure', (msg) => {
  console.error('❌ Fallo de autenticación:', msg);
});

client.on('ready', async () => {
  if (isReady) return;
  isReady = true;

  console.log('✅ Bot listo y conectado.');
  if (LIST_GRO_



console.log('🔄 Iniciando...');
client.initialize();


