// Importação dos pacotes necessários
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

// Inicialização do Express
const app = express();
const port = process.env.PORT || 3001; // Porta do servidor

// Middlewares
app.use(cors()); // Habilita CORS para permitir requisições do frontend
app.use(express.json()); // Habilita o parsing de JSON no corpo das requisições

// Inicialização do cliente Gemini AI
// A API Key é pega da variável de ambiente, como manda a boa prática.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Função auxiliar para mapear os valores do formulário para texto legível
const getProblemDescription = (data) => {
    const descriptions = {
        corte_energia: "Corte indevido de energia",
        danos_eletricos: "Oscilação/queda que danificou aparelhos",
        toi: "Multa / TOI indevido",
        recusa_ligacao: "Recusa na ligação de nova energia",
        cobranca_indevida: "Cobrança indevida na conta",
        outro: "Outro problema"
    };
    return descriptions[data['problem-type']] || "Não especificado";
};

// Definição da rota da API para gerar a petição
app.post('/api/generate-petition', async (req, res) => {
    try {
        const formData = req.body;

        // --- Construção do Prompt para a IA ---
        // Este é o coração da integração. Criamos um prompt detalhado
        // para guiar a IA a gerar um texto jurídico de qualidade.
        const prompt = `
            Aja como um advogado especialista em direito do consumidor e redija uma petição inicial para o Juizado Especial Cível, usando uma linguagem formal e jurídica.
            A petição deve ser completa, bem estruturada, e baseada nos seguintes dados fornecidos por um cliente:

            **1. DADOS DO AUTOR (CLIENTE):**
            - Nome Completo: ${formData['author-name']}
            - CPF: ${formData['author-cpf']}
            - Endereço Completo: ${formData['author-address']}
            - E-mail: ${formData['author-email']}
            - Telefone: ${formData['author-phone']}

            **2. DADOS DA RÉ (EMPRESA):**
            - Nome da Concessionária: ${formData['company-name']}

            **3. DETALHES DO CASO:**
            - Tipo do Problema: ${getProblemDescription(formData)}
            - Narração dos Fatos: Com base nos dados a seguir, construa uma seção "DOS FATOS" coesa e detalhada, integrando as informações de forma narrativa e fluida. Ignore os campos com 'N/A'.
                - Data do corte de energia: ${formData['corte-data'] || 'N/A'}
                - Houve aviso de corte: ${formData['corte-aviso'] || 'N/A'}
                - Havia dívida pendente: ${formData['corte-divida'] || 'N/A'}
                - Data da religação: ${formData['corte-religacao-data'] || 'Ainda não religada'}
                - Prejuízos do corte: ${formData['corte-prejuizo-detalhes'] || 'N/A'}
                - Data da oscilação de energia: ${formData['oscilacao-data'] || 'N/A'}
                - Equipamentos danificados: ${formData['oscilacao-equipamentos'] || 'N/A'}
                - Comunicou a empresa sobre os danos: ${formData['oscilacao-comunicacao'] || 'N/A'}
                - Protocolo sobre os danos: ${formData['oscilacao-protocolo'] || 'N/A'}
                - Número do TOI: ${formData['toi-numero'] || 'N/A'}
                - Data do TOI: ${formData['toi-data'] || 'N/A'}
                - Estava presente na vistoria do TOI: ${formData['toi-presente'] || 'N/A'}
                - Houve cobrança ou corte após TOI: ${formData['toi-cobranca'] || 'N/A'}
                - Data da solicitação de nova ligação: ${formData['recusa-data-solicitacao'] || 'N/A'}
                - Motivo da recusa da ligação: ${formData['recusa-motivo'] || 'N/A'}
                - Protocolo da recusa: ${formData['recusa-protocolo'] || 'N/A'}
                - Há moradores no imóvel sem energia: ${formData['recusa-moradores'] || 'N/A'}
                - Tipo de cobrança indevida: ${formData['cobranca-tipo'] || 'N/A'}
                - Houve reclamação sobre a cobrança: ${formData['cobranca-reclamacao'] || 'N/A'}
                - Protocolos da reclamação: ${formData['cobranca-protocolos'] || 'N/A'}
                - Nome foi negativado: ${formData['cobranca-negativacao'] || 'N/A'}
            
            **4. PROVAS:**
            - Lista de provas a serem anexadas: ${Array.isArray(formData.provas) ? formData.provas.join(', ') : formData.provas || 'Nenhuma especificada'}

            **5. PEDIDOS E VALORES:**
            - Pedido de Tutela de Urgência (Liminar): ${formData['urgency-request']} (Se 'sim', elabore um pedido de liminar conciso e bem fundamentado, demonstrando o 'fumus boni iuris' e o 'periculum in mora' para o caso específico).
            - Valor do Dano Material: ${formData['material-value'] || 'R$ 0,00'}
            - Pedido de Dano Moral: ${formData['dano-moral-pergunta']}
            - Valor Sugerido para Dano Moral: ${formData['moral-value'] || 'a ser arbitrado pelo juízo'}
            - Cidade e Estado para o ajuizamento: ${formData['cidade-estado']}

            **INSTRUÇÕES DE FORMATAÇÃO E ESTRUTURA:**
            - Inicie com o endereçamento: "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DO JUIZADO ESPECIAL CÍVEL DA COMARCA DE [Cidade e Estado do ajuizamento]".
            - Prossiga com a qualificação completa do autor e da ré (incluindo CNPJ genérico se não informado).
            - Crie as seguintes seções, numeradas em algarismos romanos: "I - DOS FATOS", "II - DO DIREITO" (fundamente com o Código de Defesa do Consumidor e resoluções da ANEEL pertinentes ao caso), "III - DA TUTELA DE URGÊNCIA" (apenas se solicitado), "IV - DOS PEDIDOS".
            - Na seção "DOS PEDIDOS", liste claramente cada pedido: a citação da ré, a inversão do ônus da prova, a confirmação da tutela de urgência (se houver), a condenação ao pagamento de danos materiais (se houver), a condenação ao pagamento de danos morais, e a declaração de inexigibilidade de débito (se aplicável ao caso, como em TOI ou cobrança indevida).
            - Conclua com o "VALOR DA CAUSA", que deve ser a soma dos danos materiais e morais. Se o dano moral for 'a ser arbitrado', use um valor de alçada para o cálculo.
            - Finalize com "Nestes termos, pede deferimento.", seguido de "[Local], [Data]", e um espaço para "[Nome do Autor]".
            - O texto deve ser contínuo, sem markdown, pronto para ser copiado e colado.
        `;

        // Chamada para a API do Gemini
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Usando um modelo poderoso para a tarefa
            contents: prompt,
        });

        // Retorna o texto gerado pela IA para o frontend
        res.json({ text: response.text });

    } catch (error) {
        console.error('Erro ao chamar a API Gemini:', error);
        res.status(500).json({ error: 'Falha ao gerar a petição. Verifique sua chave de API e tente novamente.' });
    }
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});