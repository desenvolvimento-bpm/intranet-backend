const { Pool } = require('pg');
const mssql = require('mssql');

const pool = new Pool({
  user: 'postgres',
  host: '192.168.0.205',
  database: 'erp_ema_teste_novo',
  password: 'bpm@2023!',
  port: 5432,
});

// Configuração para o MSSQL
const mssqlConfig = {
  user: 'sa',
  password: 'pds2772@',
  database: 'vetorh_bpm',
  server: '192.168.0.9',
  options: {
    encrypt: true, // Necessário para conexões seguras
    trustServerCertificate: true, // Para desenvolvimento local
  },
};

async function getMssqlConnection() {
  try {
    const pool = new mssql.ConnectionPool(mssqlConfig);
    await pool.connect();
    console.log('Conexão com MSSQL estabelecida com sucesso.');
    return pool;
  } catch (error) {
    console.error('Erro ao conectar no MSSQL:', error);
    throw error;
  }
}

module.exports = {
  pool,
  getMssqlConnection,
  mssql,
};
