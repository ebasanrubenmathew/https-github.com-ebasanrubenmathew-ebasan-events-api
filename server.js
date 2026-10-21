const http = require('node:http');

const PORT = process.env.PORT || 3000;
const MAX_BODY_SIZE = 100 * 1024;

let events = [
  { id: 1, title: 'Intramurals Opening', date: '2026-11-05', location: 'School Gym', organizer: 'Student Council' },
];
let nextId = 2;

function validateEvent(body, partial = false) {
  const errors = [];
  const rules = {
    title: { required: true },
    date: { required: true, isDate: true },
    location: { required: true },
    organizer: { required: false },
  };

  for (const [field, rule] of Object.entries(rules)) {
    const value = body[field];
    if (value === undefined) {
      if (rule.required && !partial) errors.push(`${field} is required`);
      continue;
    }
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${field} must be a non-empty string`);
    } else if (rule.isDate && isNaN(Date.parse(value))) {
      errors.push(`${field} must be a valid date (YYYY-MM-DD)`);
    }
  }
  return errors;
}

function sendJson(res, status, data, headOnly = false) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(headOnly ? undefined : body);
}

function readJsonBody(req) {
  const contentType = req.headers['content-type'] || '';
  if (!/^application\/(?:[\w.+-]+\+)?json(?:\s*;|$)/i.test(contentType)) {
    return Promise.resolve({});
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        tooLarge = true;
        chunks.length = 0;
      } else if (!tooLarge) {
        chunks.push(chunk);
      }
    });
    req.on('end', () => {
      if (tooLarge) {
        reject(Object.assign(new Error('Request body too large'), { status: 413 }));
        return;
      }
      if (size === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('Invalid JSON in request body'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function findIndexById(idValue) {
  const id = Number(idValue);
  if (!Number.isInteger(id)) return -2;
  return events.findIndex((event) => event.id === id);
}

function updateEvent(idValue, body, partial, res) {
  const index = findIndexById(idValue);
  if (index === -2) return sendJson(res, 400, { error: 'ID must be an integer' });
  if (index === -1) return sendJson(res, 404, { error: 'Event not found' });

  const errors = validateEvent(body, partial);
  if (errors.length) return sendJson(res, 400, { errors });

  const { title, date, location, organizer } = body;
  const current = events[index];
  events[index] = {
    id: current.id,
    title: title !== undefined ? title.trim() : current.title,
    date: date !== undefined ? date.trim() : current.date,
    location: location !== undefined ? location.trim() : current.location,
    organizer: organizer !== undefined ? organizer.trim() : (partial ? current.organizer : ''),
  };
  sendJson(res, 200, events[index]);
}

const server = http.createServer(async (req, res) => {
  const reply = (status, data) => sendJson(res, status, data, req.method === 'HEAD');
  let pathname;
  try {
    pathname = new URL(req.url, 'http://localhost').pathname;
  } catch {
    reply(400, { error: 'Invalid URL' });
    return;
  }

  let body = {};
  try {
    body = (await readJsonBody(req)) || {};
  } catch (error) {
    if (error.status === 413) {
      reply(413, { error: error.message });
    } else if (error.status === 400) {
      reply(400, { error: error.message });
    } else {
      console.error(error);
      if (!res.headersSent) reply(500, { error: 'Internal server error' });
    }
    return;
  }

  if (pathname === '/' && (req.method === 'GET' || req.method === 'HEAD')) {
    reply(200, { status: 'ok', message: 'Events API is running', endpoints: '/api/events' });
    return;
  }
  if (pathname === '/api/events' && (req.method === 'GET' || req.method === 'HEAD')) {
    reply(200, events);
    return;
  }
  if (pathname === '/api/events' && req.method === 'POST') {
    const errors = validateEvent(body);
    if (errors.length) return reply(400, { errors });

    const event = {
      id: nextId++,
      title: body.title.trim(),
      date: body.date.trim(),
      location: body.location.trim(),
      organizer: body.organizer ? body.organizer.trim() : '',
    };
    events.push(event);
    return reply(201, event);
  }

  const eventRoute = pathname.match(/^\/api\/events\/([^/]+)$/);
  if (eventRoute) {
    let id;
    try {
      id = decodeURIComponent(eventRoute[1]);
    } catch {
      return reply(400, { error: 'Invalid URL' });
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      const index = findIndexById(id);
      if (index === -2) return reply(400, { error: 'ID must be an integer' });
      if (index === -1) return reply(404, { error: 'Event not found' });
      return reply(200, events[index]);
    }
    if (req.method === 'POST') {
      return reply(404, { error: 'Route not found' });
    }
    if (req.method === 'PUT' || req.method === 'PATCH') {
      return updateEvent(id, body, req.method === 'PATCH', res);
    }
    if (req.method === 'DELETE') {
      const index = findIndexById(id);
      if (index === -2) return reply(400, { error: 'ID must be an integer' });
      if (index === -1) return reply(404, { error: 'Event not found' });
      const [removed] = events.splice(index, 1);
      return reply(200, { message: 'Event deleted', deleted: removed });
    }
  }

  if (req.method === 'HEAD') {
    res.writeHead(404);
    res.end();
    return;
  }
  reply(404, { error: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
