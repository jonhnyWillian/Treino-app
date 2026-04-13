import sql from "mssql"; 
import dotenv from "dotenv"; // Permite usar variáveis de ambiente (.env)

dotenv.config(); // Carrega as variáveis do arquivo .env

// Configuração da conexão com o banco de dados
const config = {
  server: "localhost", // Servidor do SQL Server
  database: process.env.DB_DATABASE, // Nome do banco (via .env)
  user: process.env.DB_USER, // Usuário do banco
  password: process.env.DB_PASSWORD, // Senha do banco
  //port: 1433, // Porta padrão do SQL Server
  options: {
    encrypt: false, // Desativa criptografia (local)
    trustServerCertificate: true, // Confia no certificado local
    instanceName: "SQLEXPRESS" // Nome da instância do SQL Server
  }
};

let pool = null; // Variável global para armazenar o pool de conexões

// Função que SEMPRE retorna uma conexão ativa
export async function getConnection() {
  try {
    // Se ainda não existe conexão, cria uma nova
    if (!pool) {
      pool = await sql.connect(config);
      console.log("Conectado ao SQL Server 🚀");
      // Inicializa/cria tabelas automaticamente
      await initializeTables();
    }
    return pool; // Retorna conexão ativa
  } catch (err) {
    console.error("Erro ao conectar:", err);
    throw err;
  }
}

// Função responsável por criar tabelas caso não existam
async function initializeTables() {
  try {
    const request = pool.request(); // Cria um request para executar queries
    // =========================
    // Tabela Usuarios
    // =========================
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Usuarios')
      BEGIN
        CREATE TABLE Usuarios (
          id INT PRIMARY KEY IDENTITY(1,1), -- ID auto increment
          nome NVARCHAR(100) NOT NULL,
          email NVARCHAR(150) UNIQUE NOT NULL, -- Email único
          senha NVARCHAR(200) NOT NULL,
          idade INT NULL,
          sexo NVARCHAR(20) NULL,
          telefone NVARCHAR(20) NULL,
          altura DECIMAL(5,2) NULL,
          peso DECIMAL(5,2) NULL,
          resetToken NVARCHAR(255) NULL, -- Token para redefinição de senha
          resetTokenExp DATETIME NULL, -- Expiração do token
          situacao NVARCHAR(20) DEFAULT 'ativo' NOT NULL, -- Status do usuário
          dataCriacao DATETIME DEFAULT GETDATE() NOT NULL -- Data de criação
        )
      END
    `);

    // =========================
    // Tabela Treinos
    // =========================
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Treinos')
      BEGIN
        CREATE TABLE Treinos (
          id INT PRIMARY KEY IDENTITY(1,1),
          nome NVARCHAR(100) NOT NULL,
          descricao NVARCHAR(MAX) NULL
        )
      END
      ELSE
      BEGIN
        -- Aqui você poderia alterar a coluna caso necessário
        DECLARE @maxLen INT;
        SELECT @maxLen = CHARACTER_MAXIMUM_LENGTH 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Treinos' AND COLUMN_NAME = 'descricao';
      END
    `);

    // =========================
    // Tabela Exercicios
    // =========================
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Exercicios')
      BEGIN
        CREATE TABLE Exercicios (
          id INT PRIMARY KEY IDENTITY(1,1),
          nome NVARCHAR(150) NOT NULL,
          grupoMuscular NVARCHAR(100) NULL,
          descricao NVARCHAR(MAX) NULL
        )
      END
    `);

    // =========================
    // Tabela TreinoExercicios (relacionamento)
    // =========================
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TreinoExercicios')
      BEGIN
        CREATE TABLE TreinoExercicios (
          id INT PRIMARY KEY IDENTITY(1,1),
          treinoId INT NOT NULL, -- FK para Treinos
          exercicioId INT NOT NULL, -- FK para Exercicios
          series INT NULL,
          repeticoes INT NULL,
          descansoSegundos INT NULL,
          FOREIGN KEY (treinoId) REFERENCES Treinos(id),
          FOREIGN KEY (exercicioId) REFERENCES Exercicios(id)
        )
      END
    `);

    // =========================
    // Tabela UsuarioTreinos (vincula usuário a treino)
    // =========================
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UsuarioTreinos')
      BEGIN
        CREATE TABLE UsuarioTreinos (
          id INT PRIMARY KEY IDENTITY(1,1),
          usuarioId INT NOT NULL, -- FK para Usuarios
          treinoId INT NOT NULL, -- FK para Treinos
          diaSemana NVARCHAR(20) NULL,
          FOREIGN KEY (usuarioId) REFERENCES Usuarios(id),
          FOREIGN KEY (treinoId) REFERENCES Treinos(id)
        )
      END
    `);

    // =========================
    // Tabela HistoricoTreinos
    // =========================
    await request.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HistoricoTreinos')
      BEGIN
        CREATE TABLE HistoricoTreinos (
          id INT PRIMARY KEY IDENTITY(1,1),
          usuarioId INT NOT NULL, -- FK para Usuarios
          treinoId INT NOT NULL, -- FK para Treinos
          dataTreino DATETIME DEFAULT GETDATE() NOT NULL, -- Data do treino
          FOREIGN KEY (usuarioId) REFERENCES Usuarios(id),
          FOREIGN KEY (treinoId) REFERENCES Treinos(id)
        )
      END
    `);

    console.log("Tabelas sincronizadas com o diagrama ✅");
  } catch (err) {
    console.error("Erro ao sincronizar tabelas:", err);
  }
}

// Retorna o pool existente (sem criar novo)
export function getPool() {
  if (!pool) {
    throw new Error("Banco não conectado");
  }
  return pool;
}

// Exporta o sql para uso em outras partes do projeto
export { sql };