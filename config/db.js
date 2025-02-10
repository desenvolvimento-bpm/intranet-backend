const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
    host: process.env.LOGIN_HOST,
    user: process.env.LOGIN_USER,
    password: process.env.LOGIN_PASSWORD,
    database: process.env.LOGIN_NAME,
    waitForConnections: true,
    connectionLimit: 10,
});

module.exports = pool;
