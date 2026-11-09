import { getEmails } from "./gmail";

async function main() {
    console.log("Mail Collector iniciado!");

    getEmails();

    console.log("Processamento concluído.");
}

main().catch((error) => {
    console.error("Erro:", error);
    process.exitCode = 1;
});