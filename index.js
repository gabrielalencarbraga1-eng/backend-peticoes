// index.js
// Backend SuaPetição – Express + Gemini (@google/generative-ai)

import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai"; // <= SDK estável

// ------------------------------------------------------------
// Configuração básica do servidor
// ------------------------------------------------------------
const app = express();
const port = process.env.PORT || 10000;

app.use(
  cors({
    // opcional: restrinja ao domínio do seu Netlify em produção
    // origin: ["https://SEU-SITE.netlify.app"],
    origin: "*",
  })
);
app.use(express.json());

// ------------------------------------------------------------
// Verificação da API KEY e inicialização do cliente Gemini
// ------------------------------------------------------------
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error(
    "ERRO: A variável de ambiente API_KEY não está definida no Render."
  );
}
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// Health check
app.get("/", (_req, res) => {
  res.send("Backend da SuaPetição está no ar!");
});

// ------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------
const getProblemDescription = (data) => {
  const map = {
    corte_energia: "Corte indevido de energia",
    danos_eletricos: "Oscilação/queda que danificou aparelhos",
    toi: "Multa / TOI indevido",
    recusa_ligacao: "Recusa na ligação de nova energia",
    cobranca_indevida: "Cobrança indevida na conta",
    outro: "Outro problema",
  };
  return map[data["problem-type"]] || "Não especificado";
};

const toList = (v) => {
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "string" && v.trim()) return v;
  return "Nenhuma especificada";
};

// ------------------------------------------------------------
// Rota de geração da petição
// ------------------------------------------------------------
app.post("/api/generate-petition", async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({
        error:
          "Configuração do servidor incompleta: API_KEY não encontrada no backend.",
      });
    }

    const data = req.body;

    const prompt = `
Aja como um advogado especialista em direito do consumidor e redija uma PETIÇÃO INICIAL para o Juizado Especial Cível, em linguagem formal e jurídica, com as seções estruturadas.

1) DADOS DO AUTOR
- Nome: ${data["author-name"]}
- CPF: ${data["author-cpf"]}
- Endereço: ${data["author-address"]}
- E-mail: ${data["author-email"]}
- Telefone: ${data["author-phone"]}

2) RÉ (CONCESSIONÁRIA)
- Nome: ${data["company-name"]}

3) DETALHES / FATOS
- Tipo do problema: ${getProblemDescription(data)}
- Corte: data=${data["corte-data"] || "N/A"}, aviso=${data["corte-aviso"] || "N/A"}, dívida=${data["corte-divida"] || "N/A"}, religação=${data["corte-religacao-data"] || "Ainda não religada"}, prejuízos=${data["corte-prejuizo-detalhes"] || "N/A"}
- Oscilação: data=${data["oscilacao-data"] || "N/A"}, equipamentos=${data["oscilacao-equipamentos"] || "N/A"}, comunicou=${data["oscilacao-comunicacao"] || "N/A"}, protocolo=${data["oscilacao-protocolo"] || "N/A"}
- TOI: número=${data["toi-numero"] || "N/A"}, data=${data["toi-data"] || "N/A"}, presença=${data["toi-presente"] || "N/A"}, cobrança/corte após TOI=${data["toi-cobranca"] || "N/A"}
- Recusa de ligação: solicitação=${data["recusa-data-solicitacao"] || "N/A"}, motivo=${data["recusa-motivo"] || "N/A"}, protocolo=${data["recusa-protocolo"] || "N/A"}, há moradores sem energia=${data["recusa-moradores"] || "N/A"}
- Cobrança indevida: tipo=${data["cobranca-tipo"] || "N/A"}, reclamou=${data["cobranca-reclamacao"] || "N/A"}, protocolos=${data["cobranca-protocolos"] || "N/A"}, negativação=${data["cobranca-negativacao"] || "N/A"}

4) PROVAS: ${toList(data.provas)}

5) PEDIDOS E VALORES
- Tutela de urgência (liminar): ${data["urgency-request"]}
- Danos materiais: ${data["material-value"] || "R$ 0,00"}
- Danos morais: ${data["dano-moral-pergunta"]}
- Valor sugerido danos morais: ${data["moral-value"] || "a ser arbitrado"}
- Foro: ${data["cidade-estado"]}

INSTRUÇÕES DE REDAÇÃO:
- Estruture com: Endereçamento; Qualificação das partes; I - DOS FATOS; II - DO DIREITO (CDC e resoluções ANEEL aplicáveis ao caso); III - DA TUTELA DE URGÊNCIA (somente se houve pedido de liminar); IV - DOS PEDIDOS.
- Nos pedidos, incluir: citação da ré; inversão do ônus da prova; confirmação da liminar (se houver); condenação em danos materiais (se houver); condenação em danos morais; declaração de inexigibilidade de débito quando aplicável (TOI/cobrança indevida); custas e honorários quando cabíveis.
- VALOR DA CAUSA: soma dos materiais + morais. Se os morais estiverem "a ser arbitrado", considerar valor de alçada (ex.: R$ 10.000,00) apenas para cálculo.
- Linguagem corrida, sem markdown, pronta para colar; incluir ao final "Nestes termos, pede deferimento.", [Local], [Data] e espaço para assinatura do Autor.
`;

    // Modelo: use "gemini-1.5-pro" (mais robusto) ou "gemini-1.5-flash" (mais rápido/barato)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return res.json({ text });
  } catch (err) {
    console.error("Erro ao gerar petição:", err);
    const msg =
      err?.message ||
      err?.response?.error?.message ||
      "Falha desconhecida ao contatar a IA.";
    return res.status(500).json({ error: msg });
  }
});

// ------------------------------------------------------------
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
