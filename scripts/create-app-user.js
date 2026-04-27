require("dotenv").config();

const { closePool } = require("../server/db");
const { upsertAppUser } = require("../server/auth");

async function main() {
  const [, , username, password, role = "administrador", ...nameParts] = process.argv;
  const fullName = nameParts.join(" ").trim();

  if (!username || !password) {
    throw new Error(
      "Uso: node scripts/create-app-user.js <usuario> <contrasena> [rol] [nombre visible]"
    );
  }

  const user = await upsertAppUser({
    username,
    password,
    fullName,
    role,
  });

  console.log(
    `Usuario de acceso creado/actualizado: ${user.username} · ${user.role}${
      user.fullName ? ` (${user.fullName})` : ""
    }`
  );
}

main()
  .catch((error) => {
    console.error("No se pudo crear el usuario de acceso.");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
