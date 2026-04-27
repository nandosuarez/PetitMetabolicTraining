require("dotenv").config();

const { checkConnection, closePool } = require("../server/db");

async function main() {
  const result = await checkConnection();
  console.log(`Conexion OK. Hora servidor: ${result.now}`);
}

main()
  .catch((error) => {
    console.error("No se pudo conectar a PostgreSQL.");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
