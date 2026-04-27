require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { withClient, closePool } = require("../server/db");

async function main() {
  const schemaPath = path.join(__dirname, "..", "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");

  await withClient(async (client) => {
    await client.query(schemaSql);
  });

  console.log("Base de datos inicializada correctamente.");
}

main()
  .catch((error) => {
    console.error("No se pudo inicializar la base de datos.");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
