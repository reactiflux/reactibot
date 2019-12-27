module.exports = {
  development: {
    client: "sqlite3",
    connection: {
      filename: "./db/dev.sqlite3"
    },
    migrations: {
      directory: "./db/migrations"
    }
  }
};
