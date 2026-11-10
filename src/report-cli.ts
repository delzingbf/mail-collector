import { generateReport } from "./report";

generateReport().catch((error) => {
  console.error("Erro ao gerar relatório:", error);
  process.exitCode = 1;
});