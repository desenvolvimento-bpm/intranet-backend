const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // Importa o módulo de criptografia
const router = express.Router();
const db = require("../database/db_crm"); // Importa a conexão MySQL
require("dotenv").config();

// Rota para buscar todas as fichas de entrada
/* router.get("/fichasentrada", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT idficha, revisaoficha, orcamento, cliente, nomeobra, entrada, status FROM fichasentrada"); // Consulta no banco
        res.status(200).json(rows); // Retorna os dados em formato JSON
    } catch (error) {
        console.error("Erro ao buscar dados de fichasentrada:", error);
        res.status(500).json({ error: "Erro ao buscar dados do banco" });
    }
}); */

// Rota de login
router.post("/login", async (req, res) => {
    const { login, senha } = req.body;

    console.log("Tentativa de login recebida:", { login, senha });

    if (!login || !senha) {
        return res.status(400).json({ message: "Login e senha são obrigatórios." });
    }

    try {
        // Gera o hash MD5 da senha fornecida
        const senhaHash = crypto.createHash("md5").update(senha).digest("hex");

        //console.log("Senha original:", senha);
        //console.log("Hash gerado:", senhaHash);

        // Busca no banco a senha hash correspondente
        const [rows] = await db.query(
            "SELECT iduser, perfil, senha FROM usuarios WHERE login = ? AND status = 'Ativo'",
            [login]
        );

        console.log("Resultado da consulta no banco:", rows);

        if (rows.length === 0) {
            return res.status(401).json({ message: "Usuário ou senha inválidos." });
        }

        const user = rows[0];

        // Verifica se o hash da senha fornecida corresponde ao hash armazenado no banco
        if (user.senha !== senhaHash) {
            return res.status(401).json({ message: "Usuário ou senha inválidos." });
        }

        // Gerar token JWT
        const token = jwt.sign(
            { iduser: user.iduser, perfil: user.perfil },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        console.log("Login bem-sucedido, retornando token.");
        res.json({ token, iduser: user.iduser, perfil: user.perfil });
    } catch (error) {
        console.error("Erro ao realizar login:", error);
        res.status(500).json({ message: "Erro no servidor ao realizar login." });
    }
});

router.get("/clientes", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1]; // Recupera o token do header
        if (!token) {
            return res.status(401).json({ message: "Token não fornecido." });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Decodifica o token
        const iduser = decoded.iduser; // Recupera o iduser do token

        const [rows] = await db.query(
            "SELECT cpfcnpj, nome, cidade, uf FROM clientes WHERE status = 'Ativo' AND iduser = ?",
            [iduser]
        ); // Filtra clientes pelo iduser
        res.status(200).json(rows);
    } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        res.status(500).json({ message: "Erro ao buscar clientes." });
    }
});

// Rota para buscar cliente pelo CPF/CNPJ
router.get("/clientes/:cpfcnpj", async (req, res) => {
    const { cpfcnpj } = req.params;
    try {
        const [rows] = await db.query(
            "SELECT nome, cidade, cep, endereco, bairro, uf, contato, funcao, email, telefone, fone, ie FROM clientes WHERE cpfcnpj = ?",
            [cpfcnpj]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "Cliente não encontrado." });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Erro ao buscar cliente:", error);
        res.status(500).json({ error: "Erro ao buscar cliente." });
    }
});

router.get("/ufs", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT DISTINCT uf FROM cidades");
        res.status(200).json(rows);
    } catch (error) {
        console.error("Erro ao buscar UFs:", error);
        res.status(500).json({ error: "Erro ao buscar UFs." });
    }
});


// Rota para buscar cidades por UF
router.get("/cidades/:uf", async (req, res) => {
    const { uf } = req.params;
    try {
        const [rows] = await db.query(
            "SELECT idcidade, nome, uf FROM cidades WHERE uf = ?",
            [uf]
        );

        res.status(200).json(rows);
    } catch (error) {
        console.error("Erro ao buscar cidades:", error);
        res.status(500).json({ error: "Erro ao buscar cidades." });
    }
});


// Rota para buscar tipos de obras
// Rota para buscar tipos de obras
router.get("/tipoobras", async (req, res) => {
    try {
        // Faz o SELECT na tabela tipoobras
        const [rows] = await db.query(
            "SELECT idtipo, descricao FROM tipoobras WHERE idtipo NOT IN ('11')"
        );
        res.status(200).json(rows); // Retorna os dados em JSON
    } catch (error) {
        console.error("Erro ao buscar tipos de obras:", error);
        res.status(500).json({ error: "Erro ao buscar tipos de obras." });
    }
});

// Rota para buscar fichas de entrada com base no idrepresentante
router.get("/fichasentrada", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Token não fornecido." });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const iduser = decoded.iduser; // ID do usuário logado

        const [rows] = await db.query(
            `SELECT 
                f.idficha, f.revisaoficha, f.orcamento, f.revisao, 
                f.cliente, f.nomeobra, f.entrada, f.status, 
                t.descricao AS tipoobra
            FROM fichasentrada f
            JOIN tipoobras t ON f.idtipoobra = t.idtipo
            WHERE f.idrepresentante = ?`,
            [iduser]
        );

        if (!rows.length) {
            return res.status(404).json({ message: "Nenhuma ficha encontrada." });
        }

        res.status(200).json(rows);
    } catch (error) {
        console.error("Erro ao buscar fichas de entrada:", error);
        res.status(500).json({ error: "Erro ao buscar dados do banco" });
    }
});




module.exports = router;
