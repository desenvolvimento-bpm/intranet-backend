const db = require("../config/db");

// Buscar usuário por email
const findUserByEmail = async (email) => {
    const [rows] = await db.query("SELECT * FROM usuarios WHERE email = ?", [email]);
    return rows[0];
};

// Inserir novo usuário
const createUser = async (nome, email, senhaHash, tipoUsuario, setorId = null) => {
    const [result] = await db.query(
        "INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, setor_id) VALUES (?, ?, ?, ?, ?)",
        [nome, email, senhaHash, tipoUsuario, setorId]
    );
    return result.insertId;
};

module.exports = { findUserByEmail, createUser };
