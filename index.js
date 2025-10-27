const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

// Cargar variables de entorno
const {
  WHATSAPP_GROUP_SOURCE,
  WHATSAPP_GROUP_TARGETS,
  TRIGGER,
  SEND_DELAY_MS,
  MAX_GROUPS_PER_BATCH,
  BATCH_PAUSE_MS,
  RETRY_ATTEMPTS,
  RETRY_BACKOFF_MS,
  JITTER_MS,
  LIST_GROUPS
} = process.env;

// Flag para evitar eventos "ready" duplicados
let isReady = false;

// Crear cliente con LocalAuth
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './session',         // Carpeta donde se guardan las sesiones
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
  }
});

// Mostrar QR para iniciar sesión
client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('Escanea el QR con la app de WhatsApp para vincular la sesión');
});

// Evento listo
client.on('ready', async () => {
  if (isReady) return;
  isReady = true;
  console.log('Cliente listo. Conectado a WhatsApp.');

  // Listar grupos si LIST_GROUPS está activado
  if (LIST_GROUPS === '1') {
    const chats = await client.getChats();
    chats.filter(c => c.isGroup).forEach(c => console.log(`• ${c.name}`));
    console.log('Copia estos nombres en WHATSAPP_GROUP_SOURCE y WHATSAPP_GROUP_TARGETS');
  }
});

// Escuchar mensajes
client.on('message', async msg => {
  if (!msg.hasMedia || msg.fromMe) return;
  if (!msg.body || !msg.body.toLowerCase().includes(TRIGGER.toLowerCase())) return;
  console.log('Trigger detectado en grupo origen');

  // Descargar media
  const media = await msg.downloadMedia();
  if (!media) {
    console.log('El mensaje no tiene media adjunta. Se ignora.');
    return;
  }

  // Enviar a cada grupo destino en lotes
  const groups = WHATSAPP_GROUP_TARGETS.split(',').map(g => g.trim());
  let index = 0;
  for (const groupName of groups) {
    try {
      const chats = await client.getChats();
      const chat = chats.find(c => c.isGroup && c.name === groupName);
      if (chat) {
        await chat.sendMessage(media, { caption: msg.body });
        console.log(`Enviado a ${groupName}`);
      } else {
        console.log(`Grupo no encontrado: ${groupName}`);
      }
    } catch (err) {
      console.error(`Error al enviar a ${groupName}:`, err);
    }
    index++;
    if (index % MAX_GROUPS_PER_BATCH === 0) {
      await new Promise(res => setTimeout(res, Number(BATCH_PAUSE_MS)));
    } else {
      await new Promise(res => setTimeout(res, Number(SEND_DELAY_MS)));
    }
  }
});

// Inicializar cliente
client.initialize();


console.log('🔄 Iniciando...');
client.initialize();

