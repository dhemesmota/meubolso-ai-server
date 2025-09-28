import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface QueryAnalysis {
  type: 'expense' | 'report' | 'question' | 'help' | 'unknown';
  intent: string;
  parameters: {
    period?: 'today' | 'week' | 'month' | 'year' | 'custom';
    startDate?: string;
    endDate?: string;
    category?: string;
    amount?: number;
    description?: string;
  };
  confidence: number;
}

export interface IntelligentResponse {
  type: 'expense' | 'report' | 'question' | 'help';
  data?: any;
  message?: string;
  shouldQueryDatabase?: boolean;
  queryParams?: any;
}

@Injectable()
export class AIAdvancedService {
  private openai: OpenAI;

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
          return await this.processExpenseIntent(message, analysis);

        case 'report':
          return await this.processReportIntent(message, analysis);

        case 'question':
          return await this.processQuestionIntent(message, analysis);

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
- report: relatório/consulta ("quanto gastei hoje", "relatório mês")
- question: pergunta específica ("qual minha maior despesa")
- help: pedido de ajuda ("ajuda", "help")
- unknown: não conseguiu identificar

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
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente que analisa intenções de mensagens financeiras em português. Retorne apenas JSON válido.',
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
    analysis: QueryAnalysis,
  ): Promise<IntelligentResponse> {
    // Usar o método existente de processamento de despesas
    const expenseData = await this.parseExpense(message);
    return {
      type: 'expense',
      data: expenseData,
    };
  }

  private async processReportIntent(
    message: string,
    analysis: QueryAnalysis,
  ): Promise<IntelligentResponse> {
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

  private buildQueryParameters(analysis: QueryAnalysis): any {
    const params: any = {};

    if (analysis.parameters.period) {
      params.period = analysis.parameters.period;
    }

    if (analysis.parameters.startDate) {
      params.startDate = analysis.parameters.startDate;
    }

    if (analysis.parameters.endDate) {
      params.endDate = analysis.parameters.endDate;
    }

    if (analysis.parameters.category) {
      params.category = analysis.parameters.category;
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
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'Você é o MeuBolso.AI, um assistente financeiro inteligente e amigável.',
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

  async parseExpense(message: string): Promise<any> {
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
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente que extrai informações de despesas de mensagens em português. Retorne apenas JSON válido.',
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

      const parsed = JSON.parse(response);

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

  private fallbackParse(message: string): any {
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
}
