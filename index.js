require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('dns');
const sha1 = require('js-sha1');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

mongoose.connect(
  process.env.DB_URI,
  { 
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
  ).then(() => {
    console.log('Database connection success');
  }).catch((err) => {
    console.log(err);
  });

app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

const Schema = mongoose.Schema;
const urlSchema = new Schema({
  originalUrl: {
    type: String,
    required: true
  },
  shortUrl: Number,
});
const links = mongoose.model('links', urlSchema);

app.post('/api/shorturl', function(req, res) {
  const hostname = req.body.url;
  if (hostname.startsWith("http://") || hostname.startsWith("https://")) {
    const url = hostname.replace(/(^\w+:|^)\/\//, '');
    dns.lookup(url, (err, address) => {
      if (err) {
        res.json({
          "error": "Invalid Hostname"
        });
        return;
      }
      const a = sha1.array(hostname);
      console.log(a);
      links.findOne({ shortUrl: a[1] }, function(err, data) {
        if (data) {
          res.json({
            "original_url": data.originalUrl,
            "short_url": data.shortUrl
          })
        } else {
          const entry = new links({
            originalUrl: hostname,
            shortUrl: a[0]
          });
          entry.save((err, data) => {
            if (err) return console.log(err);
            res.json({
              "original_url": data.originalUrl,
              "short_url": data.shortUrl
            });
          })
        }
      })
      console.log(address);
    });
  } else {
    res.json({
      "error": "Invalid URL"
    });
  }
});

app.get('/api/shorturl/:id?', (req, res) => {
  const { id } = req.params;
  links.findOne({ shortUrl: id }, (err, data) => {
    if (!data) {
      return res.json({
        "error": "No short URL found for the given input"
      });
    } else if (err) {
      console.log(err);
    } else if (data) {
      res.redirect(data.originalUrl);
    }
  });
});