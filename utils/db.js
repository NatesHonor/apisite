const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  uri: process.env.MYSQL_URL,
  connectionLimit: 2,
});

module.exports = pool.promise();
