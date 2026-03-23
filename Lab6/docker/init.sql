CREATE DATABASE testdb;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT
);

INSERT INTO users (name) VALUES ('Du'), ('Admin');

SELECT * FROM users;