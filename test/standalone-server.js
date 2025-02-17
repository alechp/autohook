const {Autohook, setWebhook, validateWebhook} = require('..');

const url = require('url');
const ngrok = require('ngrok');
const http = require('http');

const PORT = process.env.PORT || 4242;

const startServer = (port, auth) => http.createServer((req, res) => {
  const route = url.parse(req.url, true);

  if (!route.pathname) {
    return;
  }

  if (route.query.crc_token) {
    return validateWebhook(route.query.crc_token, auth, res);
  }

  if (req.method === 'POST' && req.headers['content-type'] === 'application/json') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      console.log('Event received:', body);
      res.writeHead(200);
      res.end();
    });
  }
}).listen(port);

(async () => {
  try {

    const url = await ngrok.connect(PORT);
    const webhookURL = `${url}/standalone-server/webhook`;

    const config = {
      token: process.env.TWITTER_ACCESS_TOKEN,
      token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
      env: process.env.TWITTER_WEBHOOK_ENV,
    };

    const server = startServer(PORT, config);


    const webhook = new Autohook(config);
    await webhook.removeWebhooks();
    await setWebhook(url, config, config.env);
    await webhook.subscribe({
      oauth_token: config.token,
      oauth_token_secret: config.token_secret,
    });
    
  } catch(e) {
    console.error(e);
    process.exit(-1);
  }
})();