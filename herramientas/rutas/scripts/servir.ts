// Sirve el mapa de revisión en http://localhost:4173
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(readFileSync(_req.url === '/rutas' ? 'salida/mapa-rutas.html' : 'salida/mapa-cobertura.html'));
}).listen(4173, '127.0.0.1');
