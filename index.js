// ------------------- BACKEND (index.js) -------------------
// Este arquivo roda no servidor (Render), não no navegador.

import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

// 1. Inicialização do Servidor Express
const app = express();
const port = process.env.PORT || 10000;

// 2. Middlewares
app.use(cors());
app.use(express.json());

// 3. Inicialização da API Gemini
if (!process.env.API_KEY) {
    console.error("ERRO CRÍTICO: A variável de ambiente API_KEY não foi definida no Render.");
    // Em um ambiente de produção, poderíamos ter um sistema de alerta aqui.
    // Por enquanto, o servidor irá falhar ao tentar usar a API, o que é um comportamento esperado.
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// 4. Definição da Rota da API
app.post('/api/generate-petition', async (req, res) => {
    try {
        const data = req.body;

        if (!data || Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'Nenhum dado recebido do formulário.' });
        }

        // 5. Construção do Prompt para a IA
        const prompt = `
            Você é um assistente jurídico especializado em criar petições iniciais para o Juizado Especial Cível (JEC) do Brasil, com foco em direito do consumidor contra concessionárias de energia elétrica. Sua linguagem deve ser formal, clara, objetiva e persuasiva.
            Baseado nos dados do formulário abaixo, gere o texto completo de uma petição inicial.

            ESTRUTURA DA PETIÇÃO:
            1.  **Endereçamento:** "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DO JUIZADO ESPECIAL CÍVEL DA COMARCA DE ${data['action-city-state'] || '[Cidade e Estado não informados]}."
            2.  **Qualificação Completa do Autor:** Inclua: Nome Completo, nacionalidade (brasileiro(a)), estado civil, profissão, portador(a) do CPF nº, e endereço completo. Use os dados fornecidos.
            3.  **Qualificação da Ré:** Inclua: Nome da empresa, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº (se informado), com sede no endereço (se informado).
            4.  **Seção "DOS FATOS":** Narre os acontecimentos de forma cronológica e detalhada, usando as respostas do usuário. Seja claro e direto.
            5.  **Seção "DO DIREITO":** Fundamente juridicamente o pedido. Cite o Código de Defesa do Consumidor (CDC), especialmente a falha na prestação de serviço (Art. 14), a responsabilidade objetiva da empresa, e, se aplicável, a cobrança indevida e o direito à repetição de indébito (Art. 42), e o dano moral puro (in re ipsa) pela perda de tempo útil e pelo transtorno causado.
            6.  **Seção "DA TUTELA DE URGÊNCIA" (APENAS SE SOLICITADO):** Se o usuário pediu uma decisão urgente, crie esta seção. Justifique a necessidade da medida liminar com base no "periculum in mora" (o perigo da demora) e no "fumus boni iuris" (a fumaça do bom direito), explicando por que o autor não pode esperar pela decisão final.
            7.  **Seção "DOS PEDIDOS":** Liste todos os pedidos de forma clara e numerada:
                a) A citação da ré para responder à presente ação.
                b) A concessão da tutela de urgência (se solicitada), para determinar que a ré... (ex: religue a energia, suspenda a cobrança).
                c) A inversão do ônus da prova, conforme o Art. 6º, VIII, do CDC.
                d) A procedência total da ação para confirmar a tutela de urgência (se houver) e condenar a ré a... (ex: cancelar o débito em definitivo, indenizar o dano material).
                e) A condenação da ré ao pagamento de indenização por danos morais no valor de R$ ${data['moral-value'] || '[valor a ser arbitrado por Vossa Excelência]'}, ou em valor que Vossa Excelência entender justo.
            8.  **Seção "DO VALOR DA CAUSA":** Atribua à causa o valor de R$ [some os valores de dano material e moral aqui].
            9.  **Fechamento:** "Nestes termos, pede deferimento. \n\n${data['action-city-state'] || '[Local]'}, [Data]. \n\n________________________________________\n${data['author-name'] || '[Nome Completo do Autor]'}"

            DADOS DO FORMULÁRIO PARA PREENCHIMENTO:
            -------------------------------------------------
            - Problema Principal: ${data['problem-type'] || 'Não especificado'}
            - Nome Completo do Autor: ${data['author-name'] || 'Não informado'}
            - CPF do Autor: ${data['author-cpf'] || 'Não informado'}
            - Endereço do Autor: ${data['author-address'] || 'Não informado'}
            - Contato do Autor: ${data['author-contact'] || 'Não informado'}
            - Nome da Empresa Ré: ${data['company-name'] || 'Não informado'}
            - CNPJ/Endereço da Ré: ${data['company-details'] || 'Não informado'}
            - Pedido de Dano Moral: ${data['dano-moral-pergunta'] === 'sim' ? 'Sim' : 'Não'}
            - Valor Sugerido Dano Moral: ${data['moral-value'] || 'A ser arbitrado pelo juízo'}
            - Valor Dano Material: ${data['material-value'] || 'R$ 0,00'}
            - Pedido de Tutela de Urgência (Liminar): ${data['urgent-decision'] === 'sim' ? 'Sim' : 'Não'}
            - Detalhes adicionais do caso (usar para a seção 'DOS FATOS'): ${JSON.stringify(data, null, 2)}
            -------------------------------------------------

            Agora, por favor, gere o texto completo e coeso da petição inicial.
        `; // 

        // 6. Chamada para a API do Gemini
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ parts: [{ text: prompt }] }],
        });

        const petitionText = response.text;

        res.json({ text: petitionText });

    } catch (error) {
        console.error("Erro ao chamar a API Gemini:", error);
        res.status(500).json({ error: 'Falha ao gerar a petição no servidor.', details: error.message });
    }
});

// 8. Inicia o Servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
