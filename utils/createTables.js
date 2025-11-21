const pool = require('./db');

async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS account_data (
        userid INT NOT NULL AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'customer',
        verified BOOLEAN NOT NULL DEFAULT FALSE,
        PRIMARY KEY (userid)
      );
    `);
  } catch (error) {
    console.error("Error creating table:", error);
  }
}

module.exports = createTables;
