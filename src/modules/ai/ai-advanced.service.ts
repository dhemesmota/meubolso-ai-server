import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface QueryAnalysis {
  type:
    | 'expense'
    | 'report'
    | 'question'
    | 'help'
    | 'analysis'
    | 'conversation'
    | 'unknown';
  intent: string;
  parameters: {
    period?: 'today' | 'week' | 'month' | 'year' | 'custom';
    startDate?: string;
    endDate?: string;
    category?: string;
    amount?: number;
    description?: string;
    analysisType?: 'health' | 'trends' | 'categories' | 'comparison';
    specificDate?: string;
  };
  confidence: number;
}

export interface IntelligentResponse {
  type:
    | 'expense'
    | 'report'
    | 'question'
    | 'help'
    | 'analysis'
    | 'conversation';
  data?: any;
  message?: string;
  shouldQueryDatabase?: boolean;
  queryParams?: any;
  analysisData?: any;
  requiresExpenseData?: boolean;
}

/**
 * Serviço de IA Avançado com sistema híbrido de modelos
 *
 * Estratégia de modelos:
 * - GPT-4o: Análise de intenção e respostas inteligentes (maior precisão)
 * - GPT-3.5-turbo: Parsing de despesas (custo-benefício otimizado)
 *
 * Benefícios:
 * - Melhor compreensão de contexto financeiro
 * - Respostas mais naturais em português brasileiro
 * - Redução de custos em tarefas simples
 * - Maior precisão na análise de intenções complexas
 */
@Injectable()
export class AIAdvancedService {
  private openai: OpenAI;
  private readonly INTENT_MODEL = 'gpt-4o'; // Modelo mais avançado para análise de intenção
  private readonly RESPONSE_MODEL = 'gpt-4o'; // Modelo mais avançado para respostas inteligentes
  private readonly PARSING_MODEL = 'gpt-3.5-turbo'; // Modelo mais barato para parsing simples

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async processIntelligentMessage(
    message: string,
  ): Promise<IntelligentResponse> {
    try {
      // 1. Analisar a intenção da mensagem
      const analysis = await this.analyzeIntent(message);

      console.log('🧠 Análise da mensagem:', analysis);

      // 2. Processar baseado no tipo
      switch (analysis.type) {
        case 'expense':
          return await this.processExpenseIntent(message);

        case 'report':
          return this.processReportIntent(analysis);

        case 'question':
          return await this.processQuestionIntent(message, analysis);

        case 'analysis':
          return await this.processAnalysisIntent(message, analysis);

        case 'conversation':
          return await this.processConversationIntent(message, analysis);

        case 'help':
          return { type: 'help' };

        default:
          return { type: 'help' };
      }
    } catch (error) {
      console.error('❌ Erro no processamento inteligente:', error);
      return { type: 'help' };
    }
  }

  private async analyzeIntent(message: string): Promise<QueryAnalysis> {
    const prompt = `
Analise a seguinte mensagem e determine a intenção do usuário.
Retorne APENAS um JSON válido com as seguintes chaves:

- type: string (expense, report, question, help, unknown)
- intent: string (descrição da intenção)
- parameters: objeto com:
  - period: string (today, week, month, year, custom)
  - startDate: string (formato YYYY-MM-DD se especificado)
  - endDate: string (formato YYYY-MM-DD se especificado)
  - category: string (se mencionada)
  - amount: number (se mencionado)
  - description: string (se mencionada)
- confidence: number (0-1, confiança na análise)

TIPOS DE INTENÇÃO:
- expense: registrar despesa ("gastei 50 no mercado")
- report: relatório/consulta ("quanto gastei hoje", "relatório mês", "gastos de 15/01")
- question: pergunta específica ("qual minha maior despesa")
- analysis: análise financeira ("analise meus gastos", "como está minha saúde financeira")
- conversation: conversa geral ("oi", "como você está", "me conte sobre meus gastos")
- help: pedido de ajuda ("ajuda", "help")
- unknown: não conseguiu identificar

PARÂMETROS ADICIONAIS:
- specificDate: data específica mencionada ("gastos de 15/01", "despesas de ontem")
- analysisType: tipo de análise (health, trends, categories, comparison)

Mensagem: "${message}"

Exemplo de resposta:
{
  "type": "report",
  "intent": "consultar gastos do mês atual",
  "parameters": {
    "period": "month"
  },
  "confidence": 0.9
}
`;

    try {
      console.log(`🧠 Analisando intenção com ${this.INTENT_MODEL}...`);
      const completion = await this.openai.chat.completions.create({
        model: this.INTENT_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente especializado em análise de intenções de mensagens financeiras em português brasileiro. Use sua capacidade avançada de compreensão de contexto para identificar precisamente a intenção do usuário. Retorne apenas JSON válido.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.1,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('Resposta vazia da IA');
      }

      return JSON.parse(response) as QueryAnalysis;
    } catch (error) {
      console.error('❌ Erro na análise de intenção:', error);

      // Fallback: análise simples
      return this.fallbackIntentAnalysis(message);
    }
  }

  private fallbackIntentAnalysis(message: string): QueryAnalysis {
    const lowerMessage = message.toLowerCase();

    // Detectar despesa
    const expenseKeywords = [
      'gastei',
      'paguei',
      'comprei',
      'gasto',
      'despesa',
      'valor',
      'reais',
      'r$',
    ];
    const hasNumbers = /\d+/.test(message);
    const hasExpenseKeyword = expenseKeywords.some((keyword) =>
      lowerMessage.includes(keyword),
    );

    if (hasNumbers && hasExpenseKeyword) {
      return {
        type: 'expense',
        intent: 'registrar despesa',
        parameters: {},
        confidence: 0.8,
      };
    }

    // Detectar relatório
    const reportKeywords = [
      'quanto',
      'gastei',
      'relatório',
      'resumo',
      'total',
      'hoje',
      'mês',
      'semana',
    ];
    const hasReportKeyword = reportKeywords.some((keyword) =>
      lowerMessage.includes(keyword),
    );

    if (hasReportKeyword) {
      return {
        type: 'report',
        intent: 'consultar gastos',
        parameters: { period: 'month' },
        confidence: 0.7,
      };
    }

    // Detectar análise financeira
    const analysisKeywords = [
      'analise',
      'análise',
      'saúde financeira',
      'saude financeira',
      'como estou',
      'avaliação',
      'avaliacao',
      'insights',
      'tendências',
      'tendencias',
    ];
    const hasAnalysisKeyword = analysisKeywords.some((keyword) =>
      lowerMessage.includes(keyword),
    );

    if (hasAnalysisKeyword) {
      return {
        type: 'analysis',
        intent: 'análise financeira',
        parameters: { analysisType: 'health' },
        confidence: 0.8,
      };
    }

    // Detectar conversa
    const conversationKeywords = [
      'oi',
      'olá',
      'ola',
      'como você está',
      'como voce esta',
      'conte sobre',
      'me fale',
      'bom dia',
      'boa tarde',
      'boa noite',
    ];
    const hasConversationKeyword = conversationKeywords.some((keyword) =>
      lowerMessage.includes(keyword),
    );

    if (hasConversationKeyword) {
      return {
        type: 'conversation',
        intent: 'conversa geral',
        parameters: {},
        confidence: 0.9,
      };
    }

    // Detectar ajuda
    if (lowerMessage.includes('ajuda') || lowerMessage.includes('help')) {
      return {
        type: 'help',
        intent: 'pedido de ajuda',
        parameters: {},
        confidence: 0.9,
      };
    }

    return {
      type: 'unknown',
      intent: 'não identificado',
      parameters: {},
      confidence: 0.1,
    };
  }

  private async processExpenseIntent(
    message: string,
  ): Promise<IntelligentResponse> {
    // Usar o método existente de processamento de despesas
    const expenseData = await this.parseExpense(message);
    return {
      type: 'expense',
      data: expenseData,
    };
  }

  private processReportIntent(analysis: QueryAnalysis): IntelligentResponse {
    // Determinar parâmetros da consulta
    const queryParams = this.buildQueryParameters(analysis);

    return {
      type: 'report',
      shouldQueryDatabase: true,
      queryParams,
    };
  }

  private async processQuestionIntent(
    message: string,
    analysis: QueryAnalysis,
  ): Promise<IntelligentResponse> {
    // Gerar resposta inteligente baseada na pergunta
    const intelligentResponse = await this.generateIntelligentResponse(
      message,
      analysis,
    );

    return {
      type: 'question',
      message: intelligentResponse,
      shouldQueryDatabase: true,
      queryParams: this.buildQueryParameters(analysis),
    };
  }

  private async processAnalysisIntent(
    message: string,
    analysis: QueryAnalysis,
  ): Promise<IntelligentResponse> {
    // Gerar análise financeira inteligente
    const analysisResponse = await this.generateFinancialAnalysis(
      message,
      analysis,
    );

    return {
      type: 'analysis',
      message: analysisResponse,
      requiresExpenseData: true,
      queryParams: this.buildQueryParameters(analysis),
    };
  }

  private async processConversationIntent(
    message: string,
    analysis: QueryAnalysis,
  ): Promise<IntelligentResponse> {
    // Gerar resposta conversacional
    const conversationResponse = await this.generateConversationalResponse(
      message,
      analysis,
    );

    return {
      type: 'conversation',
      message: conversationResponse,
      requiresExpenseData: true,
    };
  }

  private buildQueryParameters(
    analysis: QueryAnalysis,
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    if (analysis.parameters.period) {
      params.period = analysis.parameters.period;
    }

    if (analysis.parameters.startDate) {
      params.startDate = analysis.parameters.startDate;
    }

    if (analysis.parameters.endDate) {
      params.endDate = analysis.parameters.endDate;
    }

    if (analysis.parameters.specificDate) {
      params.specificDate = analysis.parameters.specificDate;
    }

    if (analysis.parameters.category) {
      params.category = analysis.parameters.category;
    }

    if (analysis.parameters.analysisType) {
      params.analysisType = analysis.parameters.analysisType;
    }

    return params;
  }

  private async generateIntelligentResponse(
    message: string,
    analysis: QueryAnalysis,
  ): Promise<string> {
    const prompt = `
Você é o MeuBolso.AI, um assistente financeiro inteligente.
Responda de forma natural e útil à seguinte pergunta do usuário.

Pergunta: "${message}"

Contexto:
- Tipo de consulta: ${analysis.type}
- Intenção: ${analysis.intent}
- Parâmetros: ${JSON.stringify(analysis.parameters)}

Responda de forma:
- Natural e conversacional
- Útil e informativa
- Breve mas completa
- Em português brasileiro

Exemplo de resposta para "quanto gastei hoje":
"Vou verificar seus gastos de hoje para você! 📊"

Exemplo de resposta para "qual minha maior despesa":
"Vou analisar suas despesas para encontrar a maior! 🔍"
`;

    try {
      console.log(
        `💬 Gerando resposta inteligente com ${this.RESPONSE_MODEL}...`,
      );
      const completion = await this.openai.chat.completions.create({
        model: this.RESPONSE_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Você é o MeuBolso.AI, um assistente financeiro inteligente e amigável especializado em português brasileiro. Use sua capacidade avançada para gerar respostas naturais, contextualizadas e úteis para o usuário.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      return (
        completion.choices[0]?.message?.content || 'Vou ajudar você com isso!'
      );
    } catch (error) {
      console.error('❌ Erro ao gerar resposta inteligente:', error);
      return 'Vou ajudar você com isso!';
    }
  }

  private async generateFinancialAnalysis(
    message: string,
    analysis: QueryAnalysis,
  ): Promise<string> {
    const prompt = `
Você é o MeuBolso.AI, um especialista em análise financeira pessoal.
Analise os dados financeiros do usuário e forneça insights valiosos.

Pergunta do usuário: "${message}"

Contexto da análise:
- Tipo: ${analysis.type}
- Intenção: ${analysis.intent}
- Parâmetros: ${JSON.stringify(analysis.parameters)}

Forneça uma análise financeira que inclua:
- Resumo dos gastos no período
- Principais categorias de despesas
- Tendências e padrões identificados
- Recomendações para melhoria financeira
- Dicas práticas de economia

Seja específico, útil e encorajador. Use emojis para tornar mais amigável.
Responda em português brasileiro de forma natural e profissional.
`;

    try {
      console.log(
        `📊 Gerando análise financeira com ${this.RESPONSE_MODEL}...`,
      );

      const completion = await this.openai.chat.completions.create({
        model: this.RESPONSE_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Você é um especialista em análise financeira pessoal. Forneça insights valiosos, recomendações práticas e seja encorajador. Use português brasileiro natural.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 400,
        temperature: 0.7,
      });

      return (
        completion.choices[0]?.message?.content ||
        'Vou analisar seus dados financeiros para você! 📊'
      );
    } catch (error) {
      console.error('❌ Erro ao gerar análise financeira:', error);
      return 'Vou analisar seus dados financeiros para você! 📊';
    }
  }

  private async generateConversationalResponse(
    message: string,
    analysis: QueryAnalysis,
  ): Promise<string> {
    const prompt = `
Você é o MeuBolso.AI, um assistente financeiro conversacional e amigável.
Mantenha uma conversa natural e útil sobre finanças pessoais.

Mensagem do usuário: "${message}"

Contexto:
- Tipo: ${analysis.type}
- Intenção: ${analysis.intent}

Seja:
- Conversacional e amigável
- Útil e informativo sobre finanças
- Natural em português brasileiro
- Proativo em sugerir análises ou relatórios
- Encorajador e positivo

Se o usuário cumprimentar, responda de forma calorosa.
Se perguntar sobre gastos, ofereça análises específicas.
Se for uma conversa geral, mantenha o foco em finanças pessoais.
`;

    try {
      console.log(
        `💬 Gerando resposta conversacional com ${this.RESPONSE_MODEL}...`,
      );

      const completion = await this.openai.chat.completions.create({
        model: this.RESPONSE_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Você é o MeuBolso.AI, um assistente financeiro conversacional, amigável e útil. Mantenha conversas naturais em português brasileiro, sempre focando em ajudar com finanças pessoais.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.8,
      });

      return (
        completion.choices[0]?.message?.content ||
        'Olá! Como posso ajudar você com suas finanças hoje? 😊'
      );
    } catch (error) {
      console.error('❌ Erro ao gerar resposta conversacional:', error);
      return 'Olá! Como posso ajudar você com suas finanças hoje? 😊';
    }
  }

  async parseExpense(message: string): Promise<{
    amount: number;
    category: string;
    description: string;
    date: string;
    isValid: boolean;
  }> {
    // Reutilizar o método existente de parse de despesas
    // (implementação similar ao AIService existente)
    const today = new Date().toISOString().split('T')[0];
    const prompt = `
Analise a seguinte mensagem e extraia informações sobre uma despesa.
Retorne APENAS um JSON válido com as seguintes chaves:
- amount: número (valor da despesa em reais)
- category: string (categoria mais apropriada: Alimentação, Transporte, Moradia, Lazer, Saúde)
- description: string (descrição da despesa formatada e corrigida)
- date: string (data no formato YYYY-MM-DD, SEMPRE use a data de hoje: ${today})
- isValid: boolean (true se conseguiu extrair informações válidas)

IMPORTANTE: 
- A data deve SEMPRE ser ${today} (data de hoje). NUNCA use datas antigas.
- Se o valor estiver em dólares (USD, $, dollar), converta para reais (multiplicar por 5.2)
- Formate a descrição corretamente, corrigindo erros de digitação
- Use português brasileiro correto

Categorias disponíveis: Alimentação, Transporte, Moradia, Lazer, Saúde

Mensagem: "${message}"

Exemplo de resposta:
{
  "amount": 50,
  "category": "Alimentação", 
  "description": "mercado",
  "date": "${today}",
  "isValid": true
}
`;

    try {
      console.log(`💰 Fazendo parse da despesa com ${this.PARSING_MODEL}...`);
      const completion = await this.openai.chat.completions.create({
        model: this.PARSING_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente especializado em extrair informações de despesas de mensagens em português brasileiro. Retorne apenas JSON válido.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.1,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('Resposta vazia da IA');
      }

      const parsed = JSON.parse(response) as {
        amount: number;
        category: string;
        description: string;
        date: string;
        isValid: boolean;
      };

      // Garantir que a data seja válida
      if (parsed.date === 'hoje' || parsed.date === 'today' || !parsed.date) {
        parsed.date = new Date().toISOString().split('T')[0];
      }

      return parsed;
    } catch (error) {
      console.error('❌ Erro ao fazer parse da despesa:', error);
      return this.fallbackParse(message);
    }
  }

  private fallbackParse(message: string): {
    amount: number;
    category: string;
    description: string;
    date: string;
    isValid: boolean;
  } {
    const lowerMessage = message.toLowerCase();

    // Extrair valor
    const amountMatch = message.match(/(\d+(?:[.,]\d{2})?)/);
    const amount = amountMatch
      ? parseFloat(amountMatch[1].replace(',', '.'))
      : 0;

    // Detectar categoria por palavras-chave
    let category = 'Outros';
    if (
      lowerMessage.includes('mercado') ||
      lowerMessage.includes('comida') ||
      lowerMessage.includes('alimentação')
    ) {
      category = 'Alimentação';
    } else if (
      lowerMessage.includes('uber') ||
      lowerMessage.includes('transporte') ||
      lowerMessage.includes('gasolina')
    ) {
      category = 'Transporte';
    } else if (
      lowerMessage.includes('aluguel') ||
      lowerMessage.includes('moradia') ||
      lowerMessage.includes('casa')
    ) {
      category = 'Moradia';
    } else if (
      lowerMessage.includes('lazer') ||
      lowerMessage.includes('cinema') ||
      lowerMessage.includes('diversão')
    ) {
      category = 'Lazer';
    } else if (
      lowerMessage.includes('remédio') ||
      lowerMessage.includes('saúde') ||
      lowerMessage.includes('médico')
    ) {
      category = 'Saúde';
    }

    // Extrair descrição
    const description = message.replace(/\d+/g, '').trim();

    return {
      amount,
      category,
      description: description || 'Despesa',
      date: new Date().toISOString().split('T')[0],
      isValid: amount > 0,
    };
  }

  /**
   * Processa dados de despesas e gera análise financeira inteligente
   */
  async generateIntelligentAnalysis(
    message: string,
    expenseData: any[],
    analysis: QueryAnalysis,
  ): Promise<string> {
    const prompt = `
Você é o MeuBolso.AI, um especialista em análise financeira pessoal.
Analise os dados financeiros fornecidos e responda à pergunta do usuário.

Pergunta do usuário: "${message}"

Dados das despesas:
${JSON.stringify(expenseData, null, 2)}

Contexto da análise:
- Tipo: ${analysis.type}
- Intenção: ${analysis.intent}
- Parâmetros: ${JSON.stringify(analysis.parameters)}

Forneça uma análise detalhada que inclua:
- Resumo dos gastos no período
- Principais categorias de despesas
- Tendências e padrões identificados
- Comparações com períodos anteriores (se aplicável)
- Recomendações específicas para melhoria financeira
- Dicas práticas de economia baseadas nos dados

Seja específico, útil e encorajador. Use emojis para tornar mais amigável.
Responda em português brasileiro de forma natural e profissional.
`;

    try {
      console.log(
        `📊 Gerando análise inteligente com dados reais usando ${this.RESPONSE_MODEL}...`,
      );

      const completion = await this.openai.chat.completions.create({
        model: this.RESPONSE_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Você é um especialista em análise financeira pessoal. Analise dados reais de despesas e forneça insights valiosos, recomendações práticas e seja encorajador. Use português brasileiro natural.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return (
        completion.choices[0]?.message?.content ||
        'Vou analisar seus dados financeiros para você! 📊'
      );
    } catch (error) {
      console.error('❌ Erro ao gerar análise inteligente:', error);
      return 'Vou analisar seus dados financeiros para você! 📊';
    }
  }

  /**
   * Gera resposta conversacional com contexto dos dados financeiros
   */
  async generateContextualConversation(
    message: string,
    expenseData: any[],
    analysis: QueryAnalysis,
  ): Promise<string> {
    const prompt = `
Você é o MeuBolso.AI, um assistente financeiro conversacional e amigável.
Use os dados financeiros do usuário para manter uma conversa útil e informativa.

Mensagem do usuário: "${message}"

Dados das despesas (para contexto):
${JSON.stringify(expenseData, null, 2)}

Contexto:
- Tipo: ${analysis.type}
- Intenção: ${analysis.intent}

Seja:
- Conversacional e amigável
- Útil e informativo sobre finanças
- Natural em português brasileiro
- Proativo em sugerir análises ou relatórios baseados nos dados
- Encorajador e positivo
- Use os dados reais para dar exemplos específicos

Se o usuário cumprimentar, responda de forma calorosa e ofereça insights.
Se perguntar sobre gastos, use os dados para dar respostas específicas.
Se for uma conversa geral, mantenha o foco em finanças pessoais com dados reais.
`;

    try {
      console.log(
        `💬 Gerando conversa contextual com ${this.RESPONSE_MODEL}...`,
      );

      const completion = await this.openai.chat.completions.create({
        model: this.RESPONSE_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Você é o MeuBolso.AI, um assistente financeiro conversacional, amigável e útil. Use dados reais de despesas para manter conversas naturais e informativas em português brasileiro.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.8,
      });

      return (
        completion.choices[0]?.message?.content ||
        'Olá! Como posso ajudar você com suas finanças hoje? 😊'
      );
    } catch (error) {
      console.error('❌ Erro ao gerar conversa contextual:', error);
      return 'Olá! Como posso ajudar você com suas finanças hoje? 😊';
    }
  }
}
