const http = require('http');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const { program } = require('commander');
const superagent = require('superagent');

program
  .requiredOption('-H, --host <host>', 'адреса')
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

async function handleRequest(req, res) {
  const code = req.url.slice(1);
  const filePath = path.join(cache_dir, `${code}.jpg`);

  if (!/^\d+$/.test(code)) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('Bad Request: очікується числовий HTTP-код у шляху URL');
  }

  try {
    if (req.method === 'GET') {
      try {
        const data = await fsPromises.readFile(filePath);
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        res.end(data);
      } catch {
        console.log(`Кеш не знайдено для ${code}, отримую з http.cat...`);
        try {
          const response = await superagent.get(`https://http.cat/${code}`).buffer(true);
          const imageBuffer = response.body;

          await fsPromises.writeFile(filePath, imageBuffer);
          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          res.end(imageBuffer);
        } catch {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Не знайдено на http.cat');
        }
      }

    } else if (req.method === 'PUT') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      await fsPromises.writeFile(filePath, buffer);
      res.writeHead(201, { 'Content-Type': 'text/plain' });
      res.end('Created');

    } else if (req.method === 'DELETE') {
      await fsPromises.unlink(filePath);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Deleted');

    } else {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }
}

async function startServer() {
  await ensureCacheDir();
  const server = http.createServer(handleRequest);

  server.listen(port, host, () => {
    console.log(`Сервер запущено на http://${host}:${port}`);
    console.log(`Директорія кешу: ${cache_dir}`);
  });
}

startServer();

