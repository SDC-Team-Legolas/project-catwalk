DROP TABLE IF EXISTS imported_reviews;
DROP TAbLE IF EXISTS photos;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS products;

CREATE TABLE products(
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  slogan VARCHAR(255),
  description TEXT,
  category VARCHAR(50),
  default_price BIGINT
);

CREATE TABLE reviews(
  id SERIAL PRIMARY KEY,
  product_id INT,
  rating INT,
  date DATE,
  summary VARCHAR(255),
  body TEXT,
  recommend BOOLEAN,
  reported BOOLEAN,
  reviewer_name VARCHAR(255),
  reviewer_email VARCHAR(255),
  response VARCHAR(255),
  helpfulness INT,
  FOREIGN KEY(product_id) references products(id)
);

CREATE TABLE photos(
  id SERIAL PRIMARY KEY,
  review_id INT,
  url VARCHAR(255),
  FOREIGN KEY(review_id) references reviews(id)
);

CREATE TABLE imported_reviews(
  id VARCHAR(255),
  product_id VARCHAR(255),
  rating VARCHAR(255),
  date VARCHAR(255),
  summary VARCHAR(255),
  body TEXT,
  recommend VARCHAR(255),
  reported VARCHAR(255),
  reviewer_name VARCHAR(255),
  reviewer_email VARCHAR(255),
  response VARCHAR(255),
  helpfulness VARCHAR(255)
);

\COPY imported_reviews FROM './data/reviews.csv' DELIMITER ',' CSV HEADER;
\COPY products FROM './data/product.csv' DELIMITER ',' CSV HEADER;

INSERT INTO reviews (id, product_id, rating, date, summary, body, recommend, reported, reviewer_name, reviewer_email, response, helpfulness)
  SELECT
    i.id::int as id,
    i.product_id::int as product_id,
    i.rating::int as rating,
    TIMESTAMP 'epoch' + i.date::bigint * INTERVAL '1 second' as date,
    i.summary as summary,
    i.body as body,
    i.recommend::boolean as recommend,
    i.reported::boolean as reported,
    i.reviewer_name as reviewer_name,
    i.reviewer_email as reviewer_email,
    i.response as response,
    i.helpfulness::int as helpfulness
  FROM imported_reviews i;

\COPY photos FROM './data/reviews_photos.csv' DELIMITER ',' CSV HEADER;

DROP TABLE imported_reviews;
