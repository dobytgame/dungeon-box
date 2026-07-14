import type { LegalDocument } from '@/lib/legal/types';

export const PURCHASE_TERMS_VERSION = '1.0';
export const PURCHASE_TERMS_EFFECTIVE = 'Julho de 2026';

export const termosCompraDocument: LegalDocument = {
  title: 'Termos e Condições de Compra',
  subtitle:
    'DungeonBox — Assinatura e Produtos Avulsos. Condições de compra, produção, entrega, garantia e suporte.',
  sections: [
    {
      id: 'identificacao',
      title: 'Identificação das partes',
      subsections: [
        {
          title: 'Contratada (Fornecedora)',
          list: [
            'Razão Social: 57.205.373 DAIANA MARIA DA SILVA FARIAS',
            'CNPJ: 57.205.373/0001-16',
            'Endereço: R. Leila Gonçalves, 449 — Vila Gonçalves, São Bernardo do Campo — SP',
            'E-mail: suporte@dungeonbox.com.br',
            'Site: dungeonbox.com.br',
          ],
          paragraphs: ['Denominada neste documento como DungeonBox.'],
        },
        {
          title: 'Contratante (Cliente)',
          paragraphs: [
            'Pessoa física ou jurídica que realiza a compra ou assina os planos disponíveis no site dungeonbox.com.br, denominada neste documento como Cliente.',
          ],
        },
      ],
    },
    {
      id: 'objeto',
      title: '1. Objeto do contrato',
      paragraphs: [
        'O presente contrato regula as condições de compra e assinatura dos produtos da DungeonBox, incluindo:',
      ],
      subsections: [
        {
          title: 'a) Planos de Assinatura Mensal',
          list: [
            'Plano Aventureiro — R$89,00/mês',
            'Plano Herói — R$139,00/mês',
            'Plano Lendário — R$199,00/mês',
          ],
        },
        {
          title: 'b) Produtos Avulsos',
          paragraphs: [
            'Kit Iniciante, Kit Clássico, Kit Complexo e Kit Scatter, disponíveis no site e nos marketplaces oficiais da DungeonBox.',
          ],
        },
      ],
      list: [
        'Todos os produtos consistem em kits de cenários modulares 3D impressos em PLA ou resina, produzidos sob demanda após confirmação do pagamento.',
      ],
    },
    {
      id: 'producao',
      title: '2. Modelo de produção e prazo de entrega',
      subsections: [
        {
          title: '2.1 Produção sob demanda',
          paragraphs: [
            'Todos os produtos da DungeonBox são produzidos especialmente após a confirmação do pagamento. Não trabalhamos com estoque pronto. Isso garante qualidade e personalização em cada kit, mas implica em prazo de produção antes do envio.',
          ],
        },
        {
          title: '2.2 Prazos de produção',
          tables: [
            {
              headers: ['Produto', 'Prazo de produção', 'Prazo total estimado*'],
              rows: [
                ['Plano Aventureiro', 'Até 10 dias úteis', '15–22 dias úteis'],
                ['Plano Herói', 'Até 12 dias úteis', '17–24 dias úteis'],
                ['Plano Lendário', 'Até 20 dias úteis', '25–32 dias úteis'],
                ['Produtos Avulsos', 'Até 15 dias úteis', '20–30 dias úteis'],
              ],
            },
          ],
          paragraphs: ['*Prazo total inclui produção + transporte pela transportadora.'],
        },
        {
          title: '2.3 Início da contagem',
          paragraphs: [
            'O prazo começa a contar a partir da confirmação do pagamento, não da data do pedido.',
          ],
        },
        {
          title: '2.4 Código de rastreio',
          paragraphs: [
            'O código de rastreio será enviado por e-mail e/ou WhatsApp assim que o kit for postado.',
          ],
        },
      ],
    },
    {
      id: 'assinatura',
      title: '3. Assinatura mensal — condições específicas',
      subsections: [
        {
          title: '3.1 Renovação automática',
          paragraphs: [
            'Todos os planos de assinatura renovam automaticamente todo mês na data de aniversário da assinatura. O Cliente será cobrado no cartão de crédito cadastrado ou via Pix na data de renovação.',
          ],
        },
        {
          title: '3.2 Cancelamento',
          paragraphs: [
            'O Cliente pode cancelar a assinatura a qualquer momento pelo painel do usuário, sem carência e sem multa. O cancelamento impede a próxima renovação. Kits já pagos e em produção serão entregues normalmente.',
          ],
        },
        {
          title: '3.3 Upgrade e downgrade',
          paragraphs: [
            'O Cliente pode alterar seu plano a qualquer momento. A mudança será aplicada no próximo ciclo de cobrança.',
          ],
        },
        {
          title: '3.4 Cupons de desconto',
          paragraphs: [
            'Cupons de fundador são válidos pelo período indicado no momento da emissão. Cupons vitalícios são válidos enquanto a assinatura estiver ativa e ininterrupta. O cancelamento da assinatura invalida cupons vitalícios permanentemente.',
          ],
        },
      ],
    },
    {
      id: 'pagamento',
      title: '4. Pagamento',
      subsections: [
        {
          title: '4.1 Formas aceitas',
          list: [
            'Cartão de crédito (cobrança recorrente automática para assinaturas)',
            'Pix (pagamento à vista)',
          ],
        },
        {
          title: '4.2 Falha no pagamento',
          paragraphs: [
            'Em caso de falha na cobrança automática, o sistema tentará novamente por até 3 dias consecutivos. Após esse período, a assinatura será suspensa temporariamente até regularização pelo Cliente.',
          ],
        },
        {
          title: '4.3 Taxa de plataforma',
          paragraphs: [
            'Os preços apresentados já incluem todos os impostos e taxas aplicáveis. O frete é cobrado separadamente exceto no Plano Lendário, que inclui frete grátis para todo o Brasil.',
          ],
        },
      ],
    },
    {
      id: 'frete',
      title: '5. Frete e entrega',
      subsections: [
        {
          title: '5.1 Cálculo do frete',
          paragraphs: [
            'O frete é calculado pelo CEP do destinatário no momento do checkout, exceto para o Plano Lendário, que possui frete grátis incluso.',
          ],
        },
        {
          title: '5.2 Regiões atendidas',
          paragraphs: ['A DungeonBox realiza entregas para todo o território nacional.'],
        },
        {
          title: '5.3 Prazos por região (após postagem)',
          tables: [
            {
              headers: ['Região', 'Prazo estimado da transportadora'],
              rows: [
                ['Sul e Sudeste', '3–7 dias úteis'],
                ['Centro-Oeste e Nordeste', '5–10 dias úteis'],
                ['Norte', '7–15 dias úteis'],
              ],
            },
          ],
        },
        {
          title: '5.4 Responsabilidade após postagem',
          paragraphs: [
            'Após a postagem com código de rastreio enviado ao Cliente, a responsabilidade pelo prazo de entrega é da transportadora. Em caso de extravio ou não entrega, a DungeonBox abrirá sinistro junto à transportadora e reporá o kit sem custo adicional ao Cliente.',
          ],
        },
      ],
    },
    {
      id: 'garantia',
      title: '6. Garantia e política de trocas',
      subsections: [
        {
          title: '6.1 Garantia do produto',
          paragraphs: [
            'Todos os produtos possuem garantia de 7 dias corridos a partir da data de entrega confirmada.',
          ],
        },
        {
          title: '6.2 Situações cobertas pela garantia',
          list: [
            'Peça com defeito de impressão (deformação, falha estrutural)',
            'Peça quebrada durante o transporte',
            'Peça faltante no kit',
          ],
        },
        {
          title: '6.3 Como acionar a garantia',
          list: [
            'Fotografar a peça com defeito ou o kit recebido',
            'Enviar as fotos para suporte@dungeonbox.com.br ou pelo WhatsApp disponível no site',
            'Aguardar confirmação em até 2 dias úteis',
          ],
          paragraphs: [
            'A DungeonBox reimprimirá e reenviará apenas a peça específica com problema, sem necessidade de devolução do kit completo.',
          ],
        },
        {
          title: '6.4 Situações NÃO cobertas pela garantia',
          list: [
            'Danos causados por queda, mau uso ou modificação das peças pelo Cliente',
            'Peças pintadas ou alteradas após o recebimento',
            'Reclamações feitas após 7 dias corridos da entrega confirmada',
            'Danos causados por armazenamento inadequado (calor excessivo, umidade)',
          ],
        },
        {
          title: '6.5 Direito de arrependimento',
          paragraphs: [
            'Conforme o Código de Defesa do Consumidor (Art. 49, Lei 8.078/90), o Cliente tem 7 dias corridos a partir do recebimento para solicitar o cancelamento da compra e devolução integral do valor pago, desde que o produto não tenha sido usado e esteja em condições originais.',
            'Como os produtos são produzidos sob demanda, pedidos que já iniciaram produção não são elegíveis ao cancelamento por arrependimento, mas a DungeonBox avaliará cada caso individualmente.',
          ],
        },
      ],
    },
    {
      id: 'compatibilidade',
      title: '7. Compatibilidade e uso do produto',
      subsections: [
        {
          title: '7.1 Sistema OpenLOCK',
          paragraphs: [
            'Todos os kits utilizam o padrão OpenLOCK — sistema modular de encaixe por pressão. As peças são compatíveis entre si em qualquer mês de produção e com outros produtos do ecossistema OpenLOCK disponíveis no mercado.',
          ],
        },
        {
          title: '7.2 Escala',
          paragraphs: [
            'Todos os produtos são produzidos na escala padrão 28mm, compatíveis com D&D 5e, Tormenta RPG, Pathfinder, Old Dragon e qualquer sistema de RPG que utilize grid tático nessa escala.',
          ],
        },
        {
          title: '7.3 Uso permitido',
          paragraphs: [
            'Os produtos são destinados exclusivamente ao uso pessoal em jogos de mesa. É vedada a reprodução, revenda ou comercialização das peças adquiridas.',
          ],
        },
      ],
    },
    {
      id: 'propriedade-intelectual',
      title: '8. Propriedade intelectual',
      paragraphs: [
        'Os arquivos digitais utilizados na produção dos kits são propriedade da DungeonBox ou estão licenciados comercialmente dos seus respectivos criadores. O Cliente adquire apenas o produto físico impresso, sem qualquer direito sobre os arquivos digitais originais.',
      ],
    },
    {
      id: 'privacidade',
      title: '9. Privacidade e proteção de dados',
      paragraphs: [
        'A DungeonBox coleta e trata os dados pessoais do Cliente (nome, e-mail, endereço, telefone e dados de pagamento) exclusivamente para processamento e entrega dos pedidos, comunicações sobre o status do pedido e envio de informações sobre novidades e promoções (mediante consentimento).',
        'O tratamento dos dados segue a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018). O Cliente pode solicitar exclusão dos seus dados a qualquer momento pelo e-mail suporte@dungeonbox.com.br.',
      ],
    },
    {
      id: 'limitacao',
      title: '10. Limitação de responsabilidade',
      paragraphs: ['A DungeonBox não se responsabiliza por:'],
      list: [
        'Atrasos causados por greves, desastres naturais, pandemias ou outros eventos de força maior',
        'Atrasos causados por endereço incorreto fornecido pelo Cliente',
        'Danos decorrentes do uso inadequado dos produtos',
        'Perdas ou danos causados por terceiros após a postagem',
      ],
    },
    {
      id: 'suporte',
      title: '11. Atendimento e suporte',
      list: [
        'E-mail: suporte@dungeonbox.com.br',
        'WhatsApp: disponível no site dungeonbox.com.br',
        'Horário de atendimento: segunda a sexta, das 9h às 18h',
        'Prazo de resposta: até 24 horas em dias úteis',
      ],
    },
    {
      id: 'foro',
      title: '12. Foro e legislação aplicável',
      paragraphs: [
        'Este contrato é regido pelas leis brasileiras. Fica eleito o foro da Comarca de São Bernardo do Campo — SP para dirimir quaisquer controvérsias decorrentes deste instrumento, com renúncia a qualquer outro, por mais privilegiado que seja.',
      ],
    },
    {
      id: 'aceitacao',
      title: '13. Aceitação',
      paragraphs: [
        'Ao realizar uma compra ou assinar qualquer plano no site dungeonbox.com.br, o Cliente declara ter lido, compreendido e concordado integralmente com os presentes Termos e Condições.',
      ],
    },
  ],
};
