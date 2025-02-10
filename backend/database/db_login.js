const mysql = require("mysql2");
require("dotenv").config(); // Importa e configura o dotenv

// Configuração da conexão usando variáveis do .env
const pool = mysql.createPool({
    host: process.env.LOGIN_HOST,
    user: process.env.LOGIN_USER,
    password: process.env.LOGIN_PASSWORD,
    database: process.env.LOGIN_NAME,
    waitForConnections: true,
    connectionLimit: 20, // Para sistemas moderados
    queueLimit: 100,     // Limite de fila para evitar sobrecarga
});


// Exporta a pool para uso em outros arquivos
module.exports = pool.promise();
