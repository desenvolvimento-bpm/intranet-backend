const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

// Importar rotas
const sgRoutes = require("./routes/api_sg");        // Rotas Postgresql, mssql e SG
const mysqlRoutes = require("./routes/mysqlRoutes");
const apiLoginRoutes = require("./routes/api_login");
//const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = 5000; // Porta do servidor

// Middleware
app.use(cors());
app.use(bodyParser.json());

app.use("/api/sg", sgRoutes);        // Rotas relacionadas ao SG (Postgresql)
app.use("/api/crm", mysqlRoutes);
app.use("/api", apiLoginRoutes); // Certifique-se de que /api está correto
//app.use("/api/auth", authRoutes);


// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
