import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
const port = process.env.PORT || 3000;

// Lista de origens permitidas
const whitelist = ['https://inspiring-pika-02f0fd.netlify.app', 'http://localhost:3000', 'http://127.0.0.1:3000'];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

app.use(cors(corsOptions));
app.use(express.json());

// Endpoint de "saúde" para verificar se o servidor está no ar
app.get('/', (req, res) => {
    res.status(200).send('Servidor de Petições está no ar!');
});

app.post('/api/generate-petition', async (req, res) => {
    try {
        const data = req.body;
        
        if (!data || !data['problem-type'] || !data['author-name']) {
            return res.status(400).json({ error: 'Dados insuficientes para gerar a petição.' });
        }
        
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            console.error("API_KEY não encontrada nas variáveis de ambiente.");
            return res.status(500).json({ error: 'Configuração do servidor incompleta: API_KEY ausente.' });
        }

        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
            Você é um assistente jurídico especializado em direito do consumidor para Juizados Especiais Cíveis (JEC) no Brasil.
            Sua tarefa é redigir uma petição inicial clara, objetiva e bem fundamentada, com base nos dados fornecidos pelo usuário.
            Use uma linguagem formal, mas acessível. A petição deve ser formatada corretamente, com parágrafos bem definidos.

            ESTRUTURA DA PETIÇÃO:
            1.  **Endereçamento:** "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DO JUIZADO ESPECIAL CÍVEL DA COMARCA DE ${data['action-city-state'] || '[Cidade e Estado não informados]}."
            2.  **Qualificação do Autor:** ${data['author-name'] || '[Nome não informado]'}, nacionalidade brasileiro(a), estado civil (não informado), profissão (não informada), portador(a) do CPF nº ${data['author-cpf'] || '[CPF não informado]'}, residente e domiciliado(a) no endereço ${data['author-address'] || '[Endereço não informado]'}, com e-mail ${data['author-email'] || '[E-mail não informado]'} e telefone ${data['author-phone'] || '[Telefone não informado]'}.
            3.  **Nome da Ação:** "AÇÃO DE INDENIZAÇÃO POR DANOS MATERIAIS E MORAIS" (Ajuste o nome conforme o caso, por exemplo, se houver pedido de obrigação de fazer).
            4.  **Qualificação do Réu:** ${data['company-name'] || '[Nome da empresa não informado]'}, pessoa jurídica de direito privado, inscrita no CNPJ (a ser consultado), com sede em endereço (a ser consultado), pelos fatos e fundamentos a seguir expostos.
            5.  **Dos Fatos:** Narre os acontecimentos de forma cronológica e detalhada com base nos dados a seguir. Seja coeso e claro.
            6.  **Do Direito:** Apresente uma breve fundamentação jurídica, citando o Código de Defesa do Consumidor (Lei 8.078/90), focando na falha na prestação de serviço e na responsabilidade objetiva do fornecedor.
            7.  **Dos Pedidos:** Liste os pedidos de forma clara e numerada:
                a) A citação da ré para, querendo, apresentar resposta, sob pena de revelia;
                b) A inversão do ônus da prova, nos termos do art. 6º, VIII, do CDC;
                ${data['material-value'] && data['material-value'] !== 'R$ 0,00' ? `c) A condenação da ré a pagar indenização por danos materiais no valor de ${data['material-value']};` : ''}
                ${data['dano-moral-pergunta'] === 'sim' ? `d) A condenação da ré a pagar indenização por danos morais em valor a ser arbitrado por este juízo, sugerindo-se o valor de R$ 5.000,00 (cinco mil reais) como parâmetro mínimo;` : ''}
                ${data['liminar-pergunta'] === 'sim' ? `e) A concessão de tutela de urgência para determinar que a ré [descrever o pedido liminar, ex: restabeleça o fornecimento de energia no endereço do autor], sob pena de multa diária;` : ''}
            8.  **Do Valor da Causa:** Dê-se à causa o valor de ${data['material-value'] || 'R$ 5.000,00'}.
            9.  **Fechamento:** "Nestes termos, pede deferimento. \n\n${data['action-city-state'] || '[Local]'}, [Data Atual]."

            DADOS DETALHADOS DO CASO:
            - **Tipo de Problema:** ${data['problem-type']}
            - **Resumo dos Dados Fornecidos:** ${JSON.stringify(data, null, 2)}
            
            Agora, redija a petição completa.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: [{ parts: [{ text: prompt }] }],
        });

        res.json({ text: response.text });

    } catch (error) {
        console.error("Erro detalhado ao chamar a API Gemini:", error);
        res.status(500).json({ 
            error: 'Falha ao comunicar com a IA.',
            details: error.message 
        });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
