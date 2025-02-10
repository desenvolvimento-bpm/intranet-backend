require("dotenv").config();
const { Pool } = require("pg");
const mssql = require('mssql');

// Configuração da conexão com PostgreSQL
const pgPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

// Configuração para o MSSQL
const mssqlConfig = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    database: process.env.MSSQL_DATABASE,
    server: process.env.MSSQL_HOST,
    options: {
        encrypt: true, // Necessário para conexões seguras
        trustServerCertificate: true, // Para desenvolvimento local
    },
};

async function getMssqlConnection() {
    try {
        const pool = new mssql.ConnectionPool(mssqlConfig);
        await pool.connect();
        //console.log('Conexão com MSSQL estabelecida com sucesso.');
        return pool;
    } catch (error) {
        //console.error('Erro ao conectar no MSSQL:', error);
        throw error;
    }
}

module.exports = { pgPool, getMssqlConnection, mssql };
