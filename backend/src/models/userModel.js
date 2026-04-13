class User {

  constructor(nome, email, senha) {
    this.id = Date.now();
    this.Nome = nome;
    this.Email = email;
    this.Senha = senha;
  }

}

module.exports = User;