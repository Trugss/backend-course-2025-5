const http = require('http');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const { program } = require('commander');

program
  .requiredOption('-h, --host <host>', 'адреса')
  .requiredOption('-p, --port <port>', 'порт', parseInt)
  .requiredOption('-c, --cache <path>', 'шлях до директорії кешу');
program.parse(process.argv);

const options = program.opts();
const host = options.host;
const port = options.port;
const cache_dir = path.resolve(process.cwd(), options.cache);

async function ensureCacheDir() {
  try {
    await fsPromises.mkdir(cache_dir, { recursive: true });
  } catch (err) {
    console.error('Помилка створення директорії кешу:', err.message);
    process.exit(1);
  }
}

async function startServer() {
  await ensureCacheDir();

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Проксі сервер запущено.');
  });

  server.listen(port, host, () => {
    console.log(`Сервер запущено на http://${host}:${port}`);
    console.log(`Директорія кешу: ${cache_dir}`);
  });
}

startServer();

