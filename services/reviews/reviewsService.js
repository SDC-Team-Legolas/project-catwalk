const express = require('express');
const app = express();
const { Pool } = require('pg');
const dbConfig = require('./config-env/config.js');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let port = 1234;
let pool = new Pool({
  user: dbConfig.user,
  host: dbConfig.host,
  database: dbConfig.db,
  password: dbConfig.password,
  port: 5432});

console.log(dbConfig.password);

pool.connect((err, success) => {
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
  pool.query('SELECT * FROM reviews WHERE (product_id = $1) LIMIT $2', [req.body.product_id, count])
    .then(response => {
      let sortedReviews = response.rows.filter(review => !review.reported).sort((rowA, rowB) => {
        return rowB[sort] - rowA[sort];
      });

      let responseObj = {
        product: req.body.product_id,
        page: req.body.page,
        count: req.body.count,
        results: sortedReviews
      };
      res.send(responseObj);
    })
    .catch(err => {
      console.error(err);
      res.status(500);
      res.send(err);
    });
});

app.get('/reviews/meta', (req, res) => {
  pool.query('SELECT r.id, c.id AS cid, name, value, rating, date, summary, body, recommend, reported, reviewer_name, reviewer_email, response, helpfulness FROM characteristics c LEFT OUTER JOIN review_characteristics rc ON (c.id = rc.characteristic_id) LEFT OUTER JOIN reviews r ON (review_id = r.id) WHERE (r.product_id = $1)', [req.body.product_id])
    .then(response => {
      let ratingsFrequencies = {};
      let characteristics = {};
      let recommendationCount = {true: 0, false: 0};
      let reviewsAnalyzed = {};
      for (let review of response.rows) {
        if (!reviewsAnalyzed[review.id]) {
          if (review.recommend) { recommendationCount['true']++; } else { recommendationCount['false']++}
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

app.post('/reviews', (req, res) => {
  pool.query('INSERT INTO reviews (product_id, rating, date, summary, body, recommend, reviewer_name, reviewer_email) VALUES ($1, $2, to_timestamp($3), "$4", "$5", $6, "$7", "$8")', [req.body.product_id, req.body.rating, req.body.date, req.body.summary, req.body.body, req.body.recommend, req.body.reviewer_name, req.body.reviewer_email])
    .then(response => {
      res.status(201);
      res.end();
    })
    .catch(err => {
      res.status(500);
      res.send(err);
    });
});

app.put('/reviews/:review_id/helpful', (req, res) => {
  pool.query('UPDATE reviews SET helpfulness = helpfulness + 1 WHERE (id = $1)', [req.params.review_id])
    .then(response => {
      res.status(204);
      res.end();
    })
    .catch(err => {
      res.status(500);
      res.send(err);
    });
});

app.put('/reviews/:review_id/report', (req, res) => {
  pool.query('UPDATE reviews SET reported = true WHERE (reviews.id = $1)', [req.params.review_id])
    .then(response => {
      res.status(204);
      res.end();
    })
    .catch(err => {
      res.status(500);
      res.send(err);
    });
});

app.listen(port, () => {
  console.log(`REVIEWS SERVICE LISTENING AT PORT ${port}`);
});
