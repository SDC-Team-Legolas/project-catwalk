const express = require('express');
const app = express();
const { Client } = require('pg');
const dbConfig = require('./config-env/config.js');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let port = 1234;
let client = new Client(`postgres://${dbConfig.user}:${dbConfig.pass}@project-catwalk_db_1:5432/${dbConfig.db}`);

client.connect((err, success) => {
  if (success) {
    console.log('Connected to postgres DB!');
  } else if (err) {
    console.log('Failed to connect to postgres DB, for: ');
    console.error(err);
  }
});

app.get('/', (req, res) => {
  res.send('Responding to GET request at /');
});

app.get('/reviews', (req, res) => {
  let page = req.body.page || 1;
  let count = req.body.count || 5;
  let sort = { helpful: 'helpfulness', newest: 'date', relevant: 'rating'}[req.body.sort];
  client.query(`SELECT * FROM reviews WHERE (product_id = ${req.body.product_id}) LIMIT ${count}`)
    .then(response => {
      let sortedReviews = response.rows.sort((rowA, rowB) => {
        return rowB[sort] - rowA[sort];
      });

      let responseObj = {
        product: req.body.product_id,
        page: req.body.page,
        count: req.body.count,
        results: sortedReviews
      };
      console.log(responseObj);
      res.send(responseObj);
    })
    .catch(err => {
      console.error(err);
      res.status(500);
      res.send(err);
    });
});

app.get('/reviews/meta', (req, res) => {
  client.query(`SELECT r.id, c.id AS cid, name, value, rating, date, summary, body, recommend, reported, reviewer_name, reviewer_email, response, helpfulness FROM characteristics c LEFT OUTER JOIN review_characteristics rc ON (c.id = rc.characteristic_id) LEFT OUTER JOIN reviews r ON (review_id = r.id) WHERE (r.product_id = ${req.body.product_id})`)
    .then(response => {
      let ratingsFrequencies = {};
      let characteristics = {};
      let recommendationCount = {true: 0, false: 0};
      let reviewsAnalyzed = {};
      for (let review of response.rows) {
        if (!reviewsAnalyzed[review.id]) {
          if (review.recommended) { recommendationCount['true']++; } else { recommendationCount['false']++}
          if (ratingsFrequencies[review.rating]) {
            ratingsFrequencies[review.rating]++;
          } else {
            ratingsFrequencies[review.rating] = 1;
          }
        }
        if (characteristics[review.name]) {
          let chara = characteristics[review.name];
          chara.total += review.value;
          chara.count++;
          chara.average = chara.total / chara.count;
        } else {
          characteristics[review.name] = {id: review.cid, total: review.value, count: 1, average: review.value};
        }
      }

      res.send({
        product_id: req.body.product_id,
        ratings: ratingsFrequencies,
        recommended: recommendationCount,
        characteristics: Object.keys(characteristics).map(charaName => ({ id: characteristics[charaName].id, charaName: characteristics[charaName].average }))
      });
    });
});

app.listen(port, () => {
  console.log(`REVIEWS SERVICE LISTENING AT PORT ${port}`);
});
