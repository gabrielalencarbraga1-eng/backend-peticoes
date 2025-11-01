// index.js (ESM)
import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ✅ cria o cliente Gemini usando a variável de ambiente API_KEY (Render → Environment)
const ai = new GoogleGenerativeAI(process.env.API_KEY);

// Healthcheck simples
app.get("/", (req, res) => {
  res.send("API online ✅");
});

// Auxiliar para descrever o problema
const getProblemDescription = (data) => {
  const descriptions = {
    corte_energia: "Corte indevido de energia",
    danos_eletricos: "Oscilação/queda que danificou aparelhos",
    toi: "Multa / TOI indevido",
    recusa_ligacao: "Recusa na ligação de nova energia",
    cobranca_indevida: "Cobrança indevida na conta",
    outro: "Outro problema"
  };
  return descriptions[data["problem-type"]] || "Não especificado";
};

// ✅ Rota de geração da petição
app.post("/api/generate-petition", async (req, res) => {
  try {
    const formData = req.body;

    const prompt = `
Aja como um advogado especialista em direito do consumidor e redija uma petição inicial para o Juizado Especial Cível, com linguagem formal e jurídica.
A petição deve ser completa, bem estruturada e baseada nos dados fornecidos.

1) DADOS DO AUTOR:
- Nome: ${formData["author-name"]}
- CPF: ${formData["author-cpf"]}
- Endereço: ${formData["author-address"]}
- E-mail: ${formData["author-email"]}
- Telefone: ${formData["author-phone"]}

2) DADOS DA RÉ:
- Concessionária: ${formData["company-name"]}

3) DETALHES DO CASO:
- Tipo do Problema: ${getProblemDescription(formData)}
- Fatos (construir narrativa coesa; ignore 'N/A' quando aparecer):
  - Data do corte: ${formData["corte-data"] || "N/A"}
  - Aviso de corte: ${formData["corte-aviso"] || "N/A"}
  - Dívida pendente: ${formData["corte-divida"] || "N/A"}
  - Data da religação: ${formData["corte-religacao-data"] || "Ainda não religada"}
  - Prejuízos: ${formData["corte-prejuizo-detalhes"] || "N/A"}
  - Data da oscilação: ${formData["oscilacao-data"] || "N/A"}
  - Equipamentos danificados: ${formData["oscilacao-equipamentos"] || "N/A"}
  - Comunicou a empresa: ${formData["oscilacao-comunicacao"] || "N/A"}
  - Protocolo: ${formData["oscilacao-protocolo"] || "N/A"}
  - Nº do TOI: ${formData["toi-numero"] || "N/A"}
  - Data do TOI: ${formData["toi-data"] || "N/A"}
  - Presença na vistoria: ${formData["toi-presente"] || "N/A"}
  - Cobrança/corte após TOI: ${formData["toi-cobranca"] || "N/A"}
  - Data solicitação nova ligação: ${formData["recusa-data-solicitacao"] || "N/A"}
  - Motivo da recusa: ${formData["recusa-motivo"] || "N/A"}
  - Protocolo da recusa: ${formData["recusa-protocolo"] || "N/A"}
  - Moradores sem energia: ${formData["recusa-moradores"] || "N/A"}
  - Tipo de cobrança indevida: ${formData["cobranca-tipo"] || "N/A"}
  - Reclamação feita: ${formData["cobranca-reclamacao"] || "N/A"}
  - Protocolos: ${formData["cobranca-protocolos"] || "N/A"}
  - Nome negativado: ${formData["cobranca-negativacao"] || "N/A"}

4) PROVAS:
- ${Array.isArray(formData.provas) ? formData.provas.join(", ") : (formData.provas || "Nenhuma especificada")}

5) PEDIDOS E VALORES:
- Tutela de Urgência: ${formData["urgency-request"]}
- Dano Material: ${formData["material-value"] || "R$ 0,00"}
- Pedido de Dano Moral: ${formData["dano-moral-pergunta"]}
- Valor sugerido para Dano Moral: ${formData["moral-value"] || "a ser arbitrado"}
- Cidade/UF do ajuizamento: ${formData["cidade-estado"]}

INSTRUÇÕES:
- Estrutura obrigatória: Endereçamento; Qualificação; I - DOS FATOS; II - DO DIREITO (CDC e resoluções ANEEL pertinentes); III - DA TUTELA DE URGÊNCIA (se cabível); IV - DOS PEDIDOS; Valor da Causa; Provas; Local/Data; Assinatura.
- Nos pedidos, incluir: citação da ré; inversão do ônus da prova; tutela (se solicitada); condenação em danos materiais e morais; inexigibilidade de débito (se aplicável).
- Valor da causa: soma de materiais + morais (se moral "a ser arbitrado", usar valor de alçada).
- Saída contínua, sem markdown, pronta para colar.
`;

    // ✅ SDK correto: pegue o modelo e chame generateContent
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" }); // pode trocar por "gemini-1.5-pro"
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return res.json({ text });
  } catch (error) {
    console.error("Erro ao chamar a API Gemini:", error);
    return res.status(500).json({ error: "Falha ao gerar a petição. Verifique a API_KEY e tente novamente." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

