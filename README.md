# Mail Collector

Programa local que lê os e-mails da caixa de entrada do Gmail, extrai o corpo das mensagens e o texto de anexos PDF e Word (`.docx`) e gera um relatório Word (`.docx`). A autorização do Gmail é somente de leitura: o programa não envia, apaga nem marca mensagens como lidas.

## Plataformas

- **macOS ARM64 (Apple Silicon):** uso pelo terminal confirmado pelo mantenedor. Os testes locais também foram executados neste ambiente.
- **Windows 10 e 11 x64:** atalhos e testes preparados; a execução nativa dos `.bat` e a homologação nesses sistemas ainda estão pendentes.

Os arquivos `.bat` são exclusivos do Windows. No Mac, use os comandos npm abaixo.

## Instalação e uso no macOS ARM64

1. Instale o Node.js 24 para macOS ARM64 pela [página oficial](https://nodejs.org/en/download).
2. Abra o Terminal e entre na pasta do projeto.
3. Instale as dependências com `npm ci`. Não copie `node_modules` de um Windows ou de outra arquitetura.
4. Coloque o `credentials.json` Desktop na raiz do projeto, seguindo a configuração Google descrita adiante.
5. Sincronize, autorize a conta no navegador do mesmo Mac e gere o relatório:

```sh
cd "/caminho/para/mail-collector"
npm ci
npm run sync
npm run report
open reports
```

Execute os comandos um por vez, aguardando a conclusão. Para as verificações de desenvolvimento, use `npm run typecheck`, `npm test` e `npm run build`. Os mesmos arquivos de dados, tokens e relatórios são usados no Mac e no Windows; mantenha cópias separadas por conta e instale as dependências em cada computador.

## Requisitos no Windows 10 e 11

- Windows 10 ou Windows 11 **de 64 bits, arquitetura x64**. A validação descrita aqui tem esse alvo; Windows de 32 bits e ARM não foram validados.
- **Node.js 24**, com npm e inclusão no `PATH`. Use o instalador Windows x64 da [página oficial do Node.js](https://nodejs.org/en/download). Os atalhos verificam essa versão; o projeto declara `>=24 <25`.
- Internet para instalar dependências, autorizar a conta Google e sincronizar mensagens.
- Uma conta Gmail e um projeto Google Cloud com Gmail API habilitada e credenciais OAuth do tipo **Desktop app**.
- Uma pasta do projeto com permissão de escrita, por exemplo `C:\Users\SeuUsuario\Documents\mail-collector`. Extraia o ZIP antes de executar os atalhos.
- Word ou outro aplicativo compatível com DOCX para ler os relatórios. Não é necessário instalar Word para gerar os arquivos.

A linha Node.js 24 lista Windows x64 a partir do Windows 10 entre suas plataformas compatíveis ([referência oficial](https://github.com/nodejs/node/blob/v24.x/BUILDING.md#platform-list)). Isso indica compatibilidade da plataforma; a validação completa deste programa em cada versão do Windows depende do roteiro ao final deste documento.

## 1. Instalar o programa

1. Instale o Node.js 24 x64, mantendo npm e a opção de adicionar ao `PATH`.
2. Feche e reabra os terminais após a instalação.
3. Baixe ou clone este repositório e extraia todos os arquivos. Não copie `node_modules` de outro computador ou sistema operacional.
4. Dê dois cliques em **`instalar.bat`**. Ele executa `npm ci`, usando as versões registradas em `package-lock.json`.
5. Aguarde a mensagem de conclusão. Se aparecer erro, resolva-o antes de sincronizar.

Alternativa pelo **Prompt de Comando** (`cmd.exe`):

```bat
cd /d "C:\Users\SeuUsuario\Documents\mail-collector"
node --version
npm.cmd --version
npm.cmd ci
```

O Node deve mostrar `v24.x.x`. O npm instala também as dependências de desenvolvimento, pois os comandos de uso executam TypeScript com `tsx`; não use `--omit=dev` nesta instalação.

Os procedimentos são os mesmos no Windows 10 e 11. Se usar PowerShell, chame `npm.cmd` e execute os atalhos com o prefixo `.\`, por exemplo `.\instalar.bat`. Usar `npm.cmd` evita o bloqueio do arquivo `npm.ps1` pela política de execução, sem precisar alterar essa política.

## 2. Configurar o acesso ao Gmail

Se o responsável pelo projeto já forneceu um `credentials.json` configurado, coloque-o na raiz do programa e confirme que sua conta está autorizada como usuária de teste. Caso contrário:

1. Abra o [Google Cloud Console](https://console.cloud.google.com/) e crie ou selecione um projeto.
2. Habilite a **Gmail API** na biblioteca de APIs.
3. Configure a tela de consentimento no **Google Auth Platform**: identificação do aplicativo e público. Para uma conta pessoal em modo de teste, selecione público externo e inclua o Gmail que usará o programa entre os usuários de teste.
4. Configure o acesso de dados para o escopo `https://www.googleapis.com/auth/gmail.readonly`.
5. Crie um **OAuth client ID** com tipo **Desktop app / Aplicativo para computador**. Uma credencial de aplicativo Web não atende à configuração deste programa.
6. Baixe o JSON, renomeie para **`credentials.json`** e coloque ao lado do `package.json`. Confirme que o nome não ficou `credentials.json.json`.

Referência: [guia oficial do Gmail API para Node.js](https://developers.google.com/workspace/gmail/api/quickstart/nodejs). Os nomes de menus podem variar conforme o idioma do console.

Estrutura esperada após instalar e configurar:

```text
mail-collector/
  credentials.json
  package.json
  package-lock.json
  instalar.bat
  sincronizar_emails.bat
  gerar_relatorio.bat
  abrir_relatorio.bat
  scripts/
  src/
  node_modules/
```

Não publique `credentials.json`, `tokens/`, `data/` nem relatórios que contenham mensagens privadas. Esses caminhos estão ignorados pelo Git. O arquivo de configuração OAuth `credentials.json` pode ser entregue de forma privada ao usuário que vai operar este aplicativo Desktop; nunca entregue seu `tokens/gmail.json` junto.

### Autorizar o Gmail de outra pessoa

Para testar este MVP com outra pessoa, você pode usar **o seu projeto Google Cloud existente**. Ela não precisa criar um projeto, nem receber acesso administrativo ao seu Google Cloud.

1. No seu projeto, abra **Google Auth Platform → Audience / Público**. Com público **External / Externo** e status **Testing / Teste**, adicione o Gmail da pessoa em **Test users / Usuários de teste** e salve.
2. No computador dela, instale o programa e coloque o `credentials.json` Desktop desse projeto na raiz. Use uma instalação sem os seus arquivos `tokens/`, `data/` e `reports/`.
3. Ela executa `sincronizar_emails.bat` no Windows ou `npm run sync` no Mac.
4. Ela abre o endereço exibido no navegador do próprio computador, faz login **com a conta dela** e autoriza a leitura. Incluir o e-mail na lista de teste permite iniciar o consentimento; não substitui essa autorização.
5. O programa cria um `tokens/gmail.json` próprio para a conta dela e grava os dados localmente no computador dela.

Se o projeto for **Internal / Interno**, usuários externos à organização não poderão usá-lo dessa forma. Contas Google Workspace também podem depender da liberação do administrador. Um projeto na conta da outra pessoa é uma alternativa caso ela deva administrar o aplicativo, as credenciais e as configurações por conta própria; não é um requisito para testar o seu projeto.

Referências: [público e usuários de teste](https://support.google.com/cloud/answer/15549945) e [autorização OAuth do Google](https://developers.google.com/identity/protocols/oauth2/).

## 3. Sincronizar os e-mails

1. Dê dois cliques em **`sincronizar_emails.bat`**.
2. No primeiro uso, o terminal exibirá um endereço de autorização Google. Copie e abra esse endereço no navegador **do mesmo computador**, mantendo a janela do programa aberta.
3. Escolha a conta correta e autorize a leitura dos e-mails. Em um projeto de teste, a conta precisa estar na lista de usuários de teste. Só prossiga em uma eventual tela de aplicativo não verificado se reconhecer o projeto configurado por você ou pelo responsável.
4. O navegador retornará para `http://127.0.0.1:3000/oauth2callback`. Aguarde a confirmação e a conclusão da sincronização no terminal.
5. Confira os totais de mensagens salvas, já armazenadas, anexos pendentes e falhas.

O token fica em `tokens/gmail.json`; nos próximos usos, normalmente não é preciso repetir o login. A porta local **3000** precisa estar livre. Não é necessário configurar redirecionamento de porta no roteador.

A sincronização usa o filtro `in:inbox`: lê a caixa de entrada, inclusive categorias que estejam nela. Mensagens arquivadas fora da caixa de entrada não são incluídas. A busca é paginada e pode demorar em caixas grandes.

Os registros são gravados em `data/emails/`, um JSON por ID Gmail. Registros completos no novo formato são ignorados nas próximas sincronizações (veja a atualização para Word ao final). Para mudar de conta, guarde uma cópia e separe tanto `tokens/` quanto `data/` antes de autorizar a nova conta, evitando misturar mensagens no relatório.

## 4. Gerar e abrir o relatório

1. Depois da sincronização, execute **`gerar_relatorio.bat`**.
2. Execute **`abrir_relatorio.bat`** para abrir a pasta `reports` no Explorador de Arquivos.
3. Abra o DOCX mais recente no Word ou aplicativo compatível.
4. Confira também `pendencias-*.txt`, que lista anexos PDF ou Word que precisam de revisão.

| Atalho | O que faz |
| --- | --- |
| `instalar.bat` | Instala/reinstala dependências com `npm ci`. |
| `sincronizar_emails.bat` | Busca mensagens novas na caixa de entrada do Gmail. |
| `gerar_relatorio.bat` | Gera um DOCX e a lista de pendências a partir dos JSONs locais. |
| `abrir_relatorio.bat` | Abre a pasta de relatórios; não escolhe nem abre automaticamente um DOCX. |

A pasta `reports` é criada automaticamente. Se não houver e-mails armazenados, o gerador informa isso e não cria relatório. Gerar um relatório não exige nova consulta ao Gmail.

## Limitações do MVP

- PDFs digitalizados como imagem não passam por OCR. Arquivos sem texto extraível ou com falha são sinalizados para revisão; a sincronização continua.
- O relatório diferencia corpo do e-mail e anexos, sem tentar decidir qual deles é um capítulo.
- Quando há HTML com conteúdo útil, o extrator o converte ignorando CSS e scripts. Caso contrário, usa a versão de texto simples. Texto simples contendo código legítimo é preservado; CSS que já venha como texto, sem uma alternativa HTML útil, não é removido por adivinhação.
- Uma correção no extrator não atualiza JSONs existentes. Para refazer a coleta, feche o programa, faça backup ou renomeie `data/emails` e sincronize novamente. Só serão coletadas mensagens que ainda estejam na caixa de entrada. Gere um novo relatório depois.
- O projeto usa autorização Desktop para uso local; não fornece instalador independente, serviço em segundo plano ou interface gráfica.

## Problemas comuns

| Sintoma | Como resolver |
| --- | --- |
| Node ou npm não encontrado | Instale Node.js 24 com npm e `PATH`; feche e reabra o terminal. Confira `node --version` e `npm.cmd --version`. |
| Versão do Node incompatível | Instale a linha 24 x64 e confira qual versão está ativa no terminal. |
| Dependências ausentes ou erro no `tsx` | Execute `instalar.bat` na pasta extraída, com internet. Não reutilize `node_modules` do macOS/Linux. |
| PowerShell bloqueia `npm.ps1` | Use `npm.cmd` ou abra o Prompt de Comando; os atalhos já usam `npm.cmd`. |
| `credentials.json` não encontrado ou credenciais Desktop inválidas | Confira nome, extensão e localização. Baixe credenciais do tipo Desktop app. |
| `access_denied` ou usuário sem acesso | Confira usuário de teste, conta escolhida e possíveis restrições do administrador Google Workspace. |
| `invalid_grant` / token revogado ou expirado | Feche o programa, guarde ou remova apenas `tokens/gmail.json` e sincronize para autorizar novamente. Preserve `data/`. |
| `EADDRINUSE` na porta 3000 | Encerre o processo que ocupa a porta e tente novamente. |
| `ECONNREFUSED` no retorno do navegador | Mantenha o programa aberto e use o navegador no mesmo computador. Confira se outro processo ocupa a porta. |
| `EACCES`, `EPERM` ou arquivo em uso | Use uma pasta com permissão de escrita; feche aplicativos que estejam bloqueando arquivos. |
| Nenhuma mensagem nova | Registros existentes são ignorados; confira também se a conta e o filtro da caixa de entrada correspondem ao esperado. |
| PDF pendente | Confira o TXT de pendências. PDFs escaneados, protegidos ou danificados podem exigir tratamento manual. |

Em projetos Google com público externo e status **Testing**, tokens com escopo Gmail podem expirar após sete dias ([referência do cliente oficial Google](https://github.com/googleapis/google-api-nodejs-client#handling-refresh-tokens)). Nesse caso, autorize novamente conforme a tabela.

## Validação no Windows 10 e 11

### Testes automatizados

Após a instalação, no Prompt de Comando, na pasta do programa:

```bat
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Os testes não acessam o Gmail nem usam credenciais reais. Cobrem extração de e-mail, PDF real, Word com parágrafos e tabelas, anexos por MIME/extensão, falhas, migração de registros e geração de DOCX/TXT em pasta temporária com espaços e acentos. No Windows, executam também os atalhos de instalação, sincronização e geração com um npm simulado para conferir comandos, diretório de trabalho, códigos de saída e mensagens de erro. A abertura da pasta tem teste de falha; a abertura visual no Explorador precisa de conferência manual.

Os testes dos `.bat` usam `cmd.exe`, incluindo caminhos com espaços, acentos, `&`, parênteses e `!`. Fora do Windows, esses 11 cenários são marcados como ignorados, não como aprovados. Para automação, a variável `MAIL_COLLECTOR_NO_PAUSE=1` desativa a pausa dos atalhos.

O workflow `.github/workflows/windows.yml` executa os testes no runner Windows do GitHub após push/PR ou acionamento manual. Esse runner é Windows Server; não substitui a homologação de Windows 10/11.

### Roteiro de teste em uma máquina Windows

Repita a lista abaixo em **Windows 10 x64** e **Windows 11 x64**, anotando edição/build do Windows, resultado de `node --version`, data e eventuais erros. Use uma conta de teste com pelo menos um e-mail HTML e um PDF com texto na caixa de entrada.

- [ ] Instalação limpa por `instalar.bat`, sem `node_modules` prévio.
- [ ] `typecheck`, `test` e `build` aprovados; no Windows, nenhum teste de `.bat` deve ficar ignorado.
- [ ] Primeiro login Google concluído no navegador, com criação de `tokens/gmail.json`.
- [ ] Sincronização salva os registros e extrai o PDF de teste.
- [ ] Segunda sincronização ignora os IDs existentes, sem duplicar registros.
- [ ] E-mail HTML aparece sem CSS de elementos `style` no corpo extraído.
- [ ] Relatório é criado, abre no leitor DOCX e exibe corretamente acentos, registros e anexos.
- [ ] `abrir_relatorio.bat` abre a pasta correta, inclusive quando ela ainda não existe.
- [ ] Atalhos funcionam por dois cliques e por terminal iniciado em outra pasta.
- [ ] Erro de credenciais ausentes é exibido sem anunciar sucesso; restaure o arquivo depois.
- [ ] Sem internet, uma falha de sincronização é mostrada como erro; dados já salvos permanecem disponíveis.

**Estado da validação:** uso no macOS ARM64 confirmado pelo mantenedor; revisão do código e testes locais realizados nessa plataforma com Node.js 24. Os testes nativos de `.bat`, o workflow e a homologação manual no Windows 10/11 precisam ser executados nesses ambientes antes de declarar compatibilidade testada.

## Comandos para desenvolvimento

```bat
npm.cmd run sync
npm.cmd run report
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd start
```

`npm start` executa a sincronização compilada em `dist/`; rode `npm run build` após mudanças no código para não usar uma versão antiga. Os atalhos de uso executam diretamente os arquivos de `src/` via `tsx`.

## Leitura de anexos Word (.docx)

Anexos `.docx` são identificados pelo nome (inclusive `.DOCX`) ou pelo tipo MIME do Word. O texto de parágrafos e tabelas é extraído via Mammoth e aparece no relatório em uma seção de anexo, com o nome do arquivo, separado do corpo do e-mail. Não há OCR de imagens, nem reprodução da formatação original. O formato antigo `.doc` não é suportado.

Depois de atualizar os arquivos, execute `instalar.bat` (ou `npm ci`) para instalar a nova dependência. Execute `sincronizar_emails.bat` e depois `gerar_relatorio.bat`. Preserve `credentials.json`, `tokens/` e `data/`.

Na primeira sincronização desta versão, os registros antigos que ainda estejam na caixa de entrada são relidos automaticamente para buscar anexos Word antes ignorados. O JSON é substituído pelo mesmo ID, sem duplicação. Registros antigos fora da caixa de entrada permanecem disponíveis para o relatório, mas seus anexos Word não são recuperados automaticamente. Anexos com falha ou sem texto ficam no TXT de pendências e são tentados novamente na próxima sincronização. Registros completos passam a ser ignorados nas próximas execuções.

Os novos JSONs usam `attachments`, com tipo (`pdf` ou `docx`), nome, texto, status e erro quando houver. O relatório continua aceitando os JSONs antigos com `pdfs`, mesmo sem nova sincronização.
