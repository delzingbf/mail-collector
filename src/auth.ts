
import path from "node:path";
import process from "node:process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { google } from "googleapis";
import { CodeChallengeMethod } from "google-auth-library";

// The scope for reading emails.
const SCOPES = [ "https://www.googleapis.com/auth/gmail.readonly" ];

// The path to the credentials file.
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

const TOKEN_PATH = path.join(
  process.cwd(),
  "tokens",
  "gmail.json"
);

const PORT = 3000;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/oauth2callback`;

// Authenticate with Google and get an authorized client.

export async function getGoogleAuth() {
    // 1. Load OAuth credentials

    const file = JSON.parse(
        await readFile(CREDENTIALS_PATH, "utf8")
    );

    const credentials = file.installed;

    if (!credentials?.client_id || !credentials?.client_secret) {
        throw new Error("Credenciais OAuth Desktop inválidas.");
    }

    // 2. Create OAuth2Client
    const oauth2Client = new google.auth.OAuth2(
        credentials.client_id,
        credentials.client_secret,
        REDIRECT_URI
    );

    try {
        const savedTokens = JSON.parse(
            await readFile(TOKEN_PATH, "utf8")
        );

        if (savedTokens.refresh_token) {
            oauth2Client.setCredentials(savedTokens);

            await oauth2Client.getAccessToken();

            return oauth2Client;
        }
    } catch (error) {
        if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
        ) {
        // No token file found, proceed to authorization flow
        } else {
        throw error;
        }
    }

    // 3. Generate security parameters
    const state = randomBytes(24).toString("hex");
    const { codeVerifier, codeChallenge } =
    await oauth2Client.generateCodeVerifierAsync();

    // 4. Generate authorization URL
    const authorizationUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        prompt: "consent",
        state,
        code_challenge_method: CodeChallengeMethod.S256,
        code_challenge: codeChallenge,
    });

    // 5. Get authorization code
    const code = await new Promise<string>((resolve, reject) => {
        const server = createServer((req, res) => {
            const url = new URL(req.url ?? "/", REDIRECT_URI);

            if (url.pathname !== "/oauth2callback") {
                res.writeHead(404).end("Not found");
                return;
            }

            if (url.searchParams.get("state") !== state) {
                res.writeHead(400).end("Invalid state");
                server.close();
                reject(new Error("Estado OAuth inválido."));
                return;
            }

            const error = url.searchParams.get("error");
            const receivedCode = url.searchParams.get("code");

            if (error || !receivedCode) {
                res.writeHead(400).end("Authorization failed");
                server.close();
                reject(new Error(error ?? "Código OAuth ausente."));
                return;
            }

            res.writeHead(200, {
                "Content-Type": "text/plain; charset=utf-8",
            });
            res.end("Autorização concluída. Pode fechar esta aba.");

            server.close();
            resolve(receivedCode);
        });

        server.on("error", reject);

        server.listen(PORT, "127.0.0.1", () => {
            console.log("Abra a URL abaixo no navegador:");
            console.log(authorizationUrl);
        });
    });

    // 6. Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken({
        code,
        codeVerifier,
        redirect_uri: REDIRECT_URI,
    });

    if (!tokens.refresh_token) {
        throw new Error("Refresh token não recebido.");
    }

    // 7. Save tokens and return authorized client
    oauth2Client.setCredentials(tokens);

    await mkdir(path.dirname(TOKEN_PATH), {
        recursive: true,
    });

    await writeFile(
        TOKEN_PATH,
        JSON.stringify(tokens, null, 2),
        { mode: 0o600 }
    );

    console.log("Autorização Google Gmail concluída!");

    return oauth2Client;
}
