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
        console.log('rowA: ', rowA[sort]);
        console.log('rowB: ', rowB[sort]);
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

app.listen(port, () => {
  console.log(`REVIEWS SERVICE LISTENING AT PORT ${port}`);
});
