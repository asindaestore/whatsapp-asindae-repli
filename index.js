require('dotenv').config();
const { Client, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const {
  WHATSAPP_GROUP_SOURCE = '',
  WHATSAPP_GROUP_TARGETS = '',
  TRIGGER = '#publicar',
  SEND_DELAY_MS = '1500',
  MAX_GROUPS_PER_BATCH = '5',
  BATCH_PAUSE_MS = '12000',
} = process.env;

const SEND_DELAY = Math.max(0, Number(SEND_DELAY_MS) || 1500);
const BATCH_SIZE = Math.max(1, Number(MAX_GROUPS_PER_BATCH) || 5);
const BATCH_PAUSE = Math.max(0, Number(BATCH_PAUSE_MS) || 12000);

const GROUP_SOURCE = WHATSAPP_GROUP_SOURCE.trim();
const GROUP_TARGETS = WHATSAPP_GROUP_TARGETS.split(',').map(g => g.trim()).filter(Boolean);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const chunkArray = (arr, size) => {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

if (!GROUP_SOURCE) {
  console.error('❌ Falta WHATSAPP_GROUP_SOURCE en .env');
  process.exit(1);
}
if (!GROUP_TARGETS.length) {
  console.error('❌ Falta WHATSAPP_GROUP_TARGETS en .env');
  process.exit(1);
}

const client = new Client({
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

let isReady = false;

client.on('qr', qr => {
  console.log('🔐 Escaneá este QR:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  if (isReady) return;
  isReady = true;
  
  console.log('✅ Bot listo');
  console.log('🟡 Grupo principal:', GROUP_SOURCE);
  console.log('🔵 Grupos destino:', GROUP_TARGETS.length, 'grupos');
  console.log('👂 Escuchando mensajes...');
});

client.on('message', async (msg) => {
  try {
    const chat = await msg.getChat();
    if (chat.isGroup && chat.name === GROUP_SOURCE) {
      const texto = (msg.caption || msg.body || '').trim();
      if (texto.includes(TRIGGER) && msg.hasMedia) {
        console.log('🔔 Mensaje detectado');

        const media = await msg.downloadMedia();
        if (!media) {
          console.log('❌ Error descargando media');
          return;
        }

        const caption = texto.replace(TRIGGER, '').trim();
        const allChats = await client.getChats();
        const destinos = GROUP_TARGETS
          .map(nombre => allChats.find(c => c.isGroup && c.name === nombre))
          .filter(Boolean);

        if (!destinos.length) {
          console.log('❌ No se encontraron grupos destino');
          return;
        }

        const batches = chunkArray(destinos, BATCH_SIZE);

        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          for (const destino of batch) {
            try {
              await destino.sendMessage(
                new MessageMedia(media.mimetype, media.data, media.filename),
                { caption }
              );
              console.log(`  ✓ ${destino.name}`);
            } catch (err) {
              console.error(`  ✗ ${destino.name}:`, err.message);
            }
            await sleep(SEND_DELAY);
          }
          if (i < batches.length - 1) {
            await sleep(BATCH_PAUSE);
          }
        }
      }
    }
  } catch (err) {
    console.error('❌ Error global:', err.message);
  }
});

console.log('🔄 Iniciando...');
client.initialize();


