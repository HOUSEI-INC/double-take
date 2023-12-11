const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const { UI } = require('./constants')();
require('express-async-errors');

const app = express();
app.use('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(require('./middlewares/respond'));

app.use(bodyParser.json());

app.use(
  UI.PATH,
  express.static(`./frontend/${process.env.NODE_ENV === 'production' ? '' : 'dist/'}`, {
    index: false,
  })
);
app.use(`${UI.PATH}/api`, require('./routes'));

app.use(UI.PATH, (req, res) => {
  const html = fs.readFileSync(
    `${process.cwd()}/frontend/${process.env.NODE_ENV === 'production' ? '' : 'dist/'}index.html`,
    'utf8'
  );
  res.send(
    html.replace(
      '</head>',
      `<script>
        window.ingressUrl = '${req.headers['x-ingress-path'] || ''}';
        window.publicPath = '${UI?.PATH || ''}';
      </script>
      </head>`
    )
  );
});

app.use((err, req, res, next) => res.send(err));

module.exports = app;
