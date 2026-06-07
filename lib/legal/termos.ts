import type { LegalDocument } from '@/lib/legal/types';
import { COMPANY } from '@/lib/legal/constants';

export const termosDocument: LegalDocument = {
  title: 'Termos de Uso',
  subtitle:
    'Regras para usar o site, criar conta e manter a assinatura mensal de cenários 3D DungeonBox.',
  sections: [
    {
      id: 'aceitacao',
      title: '1. Aceitação dos termos',
      paragraphs: [
        `Ao acessar ${COMPANY.siteUrl}, criar conta ou concluir uma assinatura, você declara ter lido e concordado com estes Termos de Uso e com nossa Política de Privacidade.`,
        'Se não concordar, não utilize o serviço. Podemos recusar ou encerrar contas que violem estas regras.',
      ],
    },
    {
      id: 'servico',
      title: '2. O que é a DungeonBox',
      paragraphs: [
        'A DungeonBox é uma assinatura mensal de cenários e peças de terreno 3D para RPG e jogos de tabuleiro, impressas em escala compatível com miniaturas 28mm, com sistema de encaixe modular.',
        'Cada ciclo corresponde a um kit com quantidade de peças definida pelo plano contratado (Iniciante, Herói, Lenda ou equivalentes vigentes no site). Temas e composição dos kits podem variar conforme calendário editorial e programa de fidelidade.',
        'Imagens e descrições no site são referência; pequenas variações de cor, textura ou acabamento podem ocorrer entre lotes de impressão sem alterar a funcionalidade das peças.',
      ],
    },
    {
      id: 'conta',
      title: '3. Cadastro e conta',
      list: [
        'Você deve fornecer informações verdadeiras e mantê-las atualizadas (e-mail, CPF, telefone e endereço de entrega).',
        'É sua responsabilidade proteger o acesso à conta e notificar uso não autorizado.',
        'Uma conta por pessoa física, salvo acordos comerciais específicos.',
      ],
    },
    {
      id: 'assinatura',
      title: '4. Assinatura, preços e cobrança',
      paragraphs: [
        'A assinatura é mensal e renovada automaticamente até cancelamento, no valor do plano vigente no momento da contratação ou conforme comunicação prévia de reajuste.',
        'A cobrança é processada pelo Mercado Pago (cartão ou meios disponíveis). Falhas de pagamento podem suspender envios até regularização.',
        'Preços exibidos no site incluem impostos na forma indicada no checkout. Order bumps (kits de pintura, etc.) são cobranças adicionais opcionais no ato da assinatura ou conforme oferta vigente.',
        'Promoções e cupons têm regras próprias e prazo limitado; não são cumulativos salvo indicação expressa.',
      ],
    },
    {
      id: 'entregas',
      title: '5. Entregas',
      list: [
        'Enviamos para endereços no Brasil informados na conta. Prazos são estimativas e podem variar por região, transportadora ou força maior.',
        'É essencial que o endereço esteja completo e com CEP válido. Retornos por dados incorretos podem gerar nova cobrança de frete.',
        'O risco de extravio após entrega ao transportador segue as políticas da carrier; comunicaremos código de rastreio quando disponível.',
        'Peças são enviadas em cor base (cinza pedra) para pintura pelo assinante, salvo descrição diferente no plano ou promoção.',
      ],
    },
    {
      id: 'cancelamento',
      title: '6. Cancelamento e reembolso',
      paragraphs: [
        'Você pode cancelar a renovação a qualquer momento pelo painel da conta ou contato com suporte. O cancelamento impede cobranças futuras, mas não gera reembolso automático de ciclos já pagos e em preparação ou enviados.',
        'Direito de arrependimento (7 dias) aplica-se conforme Código de Defesa do Consumidor quando a compra ocorrer fora do estabelecimento comercial e o produto ainda não tiver sido personalizado ou enviado — avaliaremos cada caso conforme a lei.',
        'Defeitos de fabricação ou avarias no transporte devem ser reportados em até 7 dias após o recebimento, com fotos, para análise de reposição ou crédito.',
      ],
    },
    {
      id: 'propriedade',
      title: '7. Propriedade intelectual',
      paragraphs: [
        'Marcas, layout do site, fotos, textos e modelos 3D da DungeonBox são protegidos por direito autoral e propriedade industrial. A assinatura concede licença pessoal, não exclusiva e intransferível para usar as peças físicas em jogos e pintá-las.',
        'É proibido revender, escanear, reproduzir digitalmente ou comercializar os arquivos ou peças derivadas dos kits sem autorização escrita.',
      ],
    },
    {
      id: 'uso-aceitavel',
      title: '8. Uso aceitável',
      list: [
        'Não utilizar o site para atividades ilegais, fraude ou abuso de promoções.',
        'Não tentar acessar áreas restritas, interferir no funcionamento ou extrair dados de outros usuários.',
        'Não criar contas automatizadas ou múltiplas para burlar limites de assinatura.',
      ],
    },
    {
      id: 'limitacao',
      title: '9. Limitação de responsabilidade',
      paragraphs: [
        'O serviço é oferecido "como está", dentro dos padrões razoáveis de qualidade de impressão e logística. Não nos responsabilizamos por danos indiretos, lucros cessantes ou interrupções de campanhas de RPG.',
        'Nossa responsabilidade total, quando aplicável, limita-se ao valor pago pelo ciclo em questão, salvo disposição legal em contrário.',
      ],
    },
    {
      id: 'lei-foro',
      title: '10. Lei aplicável e foro',
      paragraphs: [
        'Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca do domicílio do consumidor para dirimir controvérsias, conforme o Código de Defesa do Consumidor.',
      ],
    },
    {
      id: 'alteracoes-termos',
      title: '11. Alterações',
      paragraphs: [
        'Podemos atualizar estes Termos. A versão vigente estará sempre nesta página. O uso continuado após alterações constitui aceitação, salvo quando a lei exigir novo consentimento.',
      ],
    },
    {
      id: 'contato-termos',
      title: '12. Contato',
      paragraphs: [
        `Suporte e dúvidas sobre estes termos: ${COMPANY.supportEmail}`,
        `Privacidade e dados pessoais: ${COMPANY.privacyEmail}`,
      ],
    },
  ],
};
