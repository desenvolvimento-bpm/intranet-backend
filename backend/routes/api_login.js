const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../database/db_login");

const router = express.Router();

router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
        if (rows.length === 0) {
            return res.status(401).json({ error: "Credenciais inválidas" });
        }

        const user = rows[0];
        const permissions =
            typeof user.permissions === "string"
                ? JSON.parse(user.permissions) // Parse se for string
                : user.permissions; // Use diretamente se for objeto

        // Validação de senha
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Credenciais inválidas" });
        }

        // Gera o token JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, permissions },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(200).json({ token, permissions });
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});



// Endpoint para verificar rotas protegidas
router.get("/protected", (req, res) => {
    const authHeader = req.headers.authorization;

    // Verifica se o cabeçalho Authorization está presente
    if (!authHeader) {
        return res.status(401).json({ error: "Token ausente" });
    }

    const token = authHeader.split(" ")[1];

    try {
        // Verifica a validade do token JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.status(200).json({ message: "Acesso autorizado", user: decoded });
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token expirado" });
        }
        res.status(401).json({ error: "Token inválido" });
    }
});

// Endpoint para listar usuários
router.get("/users", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id, username, role, status, permissions FROM users");
        res.status(200).json(rows);
    } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});



// Atualizar permissões e status de um usuário
router.put("/users/:id", async (req, res) => {
    const { id } = req.params;
    const { status, permissions } = req.body;

    try {
        await db.query("UPDATE users SET status = ?, permissions = ? WHERE id = ?", [
            status,
            JSON.stringify(permissions),
            id,
        ]);

        res.status(200).json({ message: "Usuário atualizado com sucesso!" });
    } catch (error) {
        console.error("Erro ao atualizar usuário:", error);
        res.status(500).json({ error: "Erro interno ao atualizar usuário" });
    }
});

module.exports = router;
