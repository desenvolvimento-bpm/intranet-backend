const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { findUserByEmail, createUser } = require("../models/userModel");
const { JWT_SECRET } = process.env;

// Registro de usuário
exports.register = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validar se username e senha foram enviados
        if (!username || !password) {
            return res.status(400).json({ message: "Nome de usuário e senha são obrigatórios!" });
        }

        // Verificar se o nome do usuário já está em uso
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "Nome de usuário já está em uso!" });
        }

        // Criptografar a senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Salvar o novo usuário no banco de dados
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        return res.status(201).json({ message: "Usuário registrado com sucesso!" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Erro ao registrar usuário!" });
    }
};

// Login de usuário
const login = async (req, res) => {
    const { email, senha } = req.body;

    try {
        const user = await findUserByEmail(email);

        // Usar hash inválido padrão para evitar tempo de resposta diferente
        const hashPadrao = "$2b$10$invalidhashinvalidhashinvalidhashinv";

        // Simular validação mesmo que o usuário não exista
        const senhaValida = user
            ? await bcrypt.compare(senha, user.senha_hash)
            : await bcrypt.compare(senha, hashPadrao);

        if (!user || !senhaValida) {
            // Retorna sempre a mesma mensagem genérica
            return res.status(401).json({ message: "Credenciais inválidas. Verifique e tente novamente." });
        }

        const token = jwt.sign({ id: user.id, tipoUsuario: user.tipo_usuario }, JWT_SECRET, { expiresIn: "1h" });

        res.json({
            token,
            user: { id: user.id, nome: user.nome, tipoUsuario: user.tipo_usuario },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao realizar login." });
    }
};


module.exports = { register, login };
