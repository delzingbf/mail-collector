import { getEmails } from "./gmail";
import { syncEmails } from "./sync";

async function main() {
    console.log("Mail Collector iniciado!");

    syncEmails();

}

main().catch((error) => {
    console.error("Erro na execução:", error);
    process.exitCode = 1;
});