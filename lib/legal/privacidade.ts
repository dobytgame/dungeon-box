import type { LegalDocument } from '@/lib/legal/types';
import { COMPANY } from '@/lib/legal/constants';

export const privacidadeDocument: LegalDocument = {
  title: 'Política de Privacidade',
  subtitle:
    'Como a DungeonBox coleta, usa e protege seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).',
  sections: [
    {
      id: 'introducao',
      title: '1. Quem somos',
      paragraphs: [
        `Esta Política de Privacidade descreve o tratamento de dados pessoais realizado pela ${COMPANY.brand} ("nós", "nosso" ou "DungeonBox"), controladora dos dados relacionados ao site ${COMPANY.siteUrl}, à assinatura mensal de cenários 3D para RPG e aos serviços associados (conta, checkout, entregas e suporte).`,
        COMPANY.cnpj
          ? `Razão social: ${COMPANY.legalName}. CNPJ: ${COMPANY.cnpj}.`
          : `Razão social e CNPJ serão informados nesta página assim que o cadastro empresarial estiver concluído.`,
        `Dúvidas sobre privacidade ou exercício de direitos: ${COMPANY.privacyEmail}.`,
      ],
    },
    {
      id: 'dados-coletados',
      title: '2. Dados que coletamos',
      paragraphs: [
        'Coletamos apenas o necessário para operar a assinatura, processar pagamentos, entregar os kits e manter sua conta segura.',
      ],
      subsections: [
        {
          title: 'Dados de cadastro e conta',
          list: [
            'Nome, e-mail e foto de perfil (quando você entra com Google ou outro provedor OAuth).',
            'CPF e telefone, quando informados no perfil ou checkout — necessários para nota fiscal, antifraude e contato sobre entregas.',
            'Senha ou tokens de autenticação gerenciados pelo provedor de login (não armazenamos senha em texto puro).',
          ],
        },
        {
          title: 'Dados de assinatura e pagamento',
          list: [
            'Plano escolhido, histórico de ciclos, status da assinatura e preferências de entrega.',
            'Dados de pagamento são processados pelo Mercado Pago; recebemos confirmações, identificadores de transação e status — não armazenamos número completo de cartão.',
            'Endereço de entrega, CEP e complemento para envio dos kits mensais.',
          ],
        },
        {
          title: 'Dados de uso e técnicos',
          list: [
            'Endereço IP, tipo de navegador, páginas acessadas e logs de erro — para segurança, diagnóstico e melhoria do site.',
            'Cookies e tecnologias similares, conforme sua escolha no banner de consentimento (veja seção 5).',
          ],
        },
        {
          title: 'Comunicações',
          list: [
            'Preferência de newsletter e histórico de e-mails transacionais (confirmação de pedido, entrega, cobrança).',
            'Mensagens enviadas ao suporte, quando você nos contatar.',
          ],
        },
      ],
    },
    {
      id: 'finalidades',
      title: '3. Para que usamos seus dados',
      paragraphs: ['Tratamos dados com base nas hipóteses legais da LGPD, principalmente:'],
      list: [
        'Execução de contrato: criar sua conta, processar assinatura, cobrar mensalidades, separar e enviar kits.',
        'Cumprimento de obrigação legal: emissão de documentos fiscais e registros exigidos por lei.',
        'Legítimo interesse: prevenir fraudes, proteger a plataforma e melhorar a experiência, sempre com equilíbrio em relação aos seus direitos.',
        'Consentimento: newsletter, cookies analíticos e de marketing — somente quando você aceitar.',
      ],
    },
    {
      id: 'compartilhamento',
      title: '4. Com quem compartilhamos',
      paragraphs: [
        'Não vendemos seus dados. Compartilhamos apenas com parceiros que nos ajudam a operar o serviço, sob contrato e medidas de segurança:',
      ],
      list: [
        'Supabase — hospedagem de banco de dados, autenticação e armazenamento de perfil.',
        'Mercado Pago — processamento de pagamentos e assinaturas recorrentes.',
        'Transportadoras e operadores logísticos — entrega dos kits ao endereço informado.',
        'Provedores de e-mail (ex.: Resend) — envio de comunicações transacionais e, se autorizado, marketing.',
        'Ferramentas de análise e publicidade — apenas se você consentir cookies opcionais correspondentes.',
        'Alguns parceiros podem estar fora do Brasil; nesses casos, adotamos cláusulas e medidas para proteger seus dados conforme a LGPD.',
      ],
    },
    {
      id: 'cookies',
      title: '5. Cookies e tecnologias similares',
      paragraphs: [
        'Cookies são pequenos arquivos salvos no seu navegador. Usamos categorias distintas:',
        'Você gerencia cookies opcionais pelo banner na primeira visita ou pelo link "Preferências de cookies" no rodapé. A recusa de analíticos e marketing não impede assinar ou usar sua conta.',
      ],
      list: [
        'Essenciais — login, sessão, checkout e registro da sua escolha de cookies. Não podem ser desativados sem prejudicar o site.',
        'Funcionais — preferências de interface (quando aplicável).',
        'Analíticos — estatísticas de uso para melhorar páginas e fluxos.',
        'Marketing — medição de campanhas e remarketing, se ativados no futuro.',
      ],
    },
    {
      id: 'retencao',
      title: '6. Por quanto tempo guardamos',
      paragraphs: [
        'Mantemos dados enquanto sua conta ou assinatura estiver ativa e pelo tempo necessário para cumprir obrigações legais, fiscais e de defesa em processos.',
        'Após cancelamento, podemos reter registros de pagamento e entrega pelo prazo legal aplicável. Dados de marketing são interrompidos quando você revoga o consentimento ou cancela a newsletter.',
      ],
    },
    {
      id: 'direitos',
      title: '7. Seus direitos (LGPD)',
      paragraphs: [
        'Você pode, a qualquer momento, solicitar:',
        `Envie pedidos para ${COMPANY.privacyEmail} com o assunto "LGPD — [seu pedido]". Podemos solicitar confirmação de identidade para proteger sua conta. Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).`,
      ],
      list: [
        'Confirmação de tratamento e acesso aos dados.',
        'Correção de dados incompletos ou desatualizados.',
        'Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade.',
        'Portabilidade a outro fornecedor, quando aplicável.',
        'Informação sobre compartilhamento e revogação de consentimento.',
        'Oposição a tratamento baseado em legítimo interesse, quando cabível.',
      ],
    },
    {
      id: 'seguranca',
      title: '8. Segurança',
      paragraphs: [
        'Adotamos medidas técnicas e organizacionais como criptografia em trânsito (HTTPS), controle de acesso, políticas de senha nos provedores e monitoramento de incidentes. Nenhum sistema é 100% seguro; em caso de incidente relevante, comunicaremos conforme a lei.',
      ],
    },
    {
      id: 'menores',
      title: '9. Crianças e adolescentes',
      paragraphs: [
        'O serviço é destinado a maiores de 18 anos ou a menores com consentimento e supervisão de responsável legal. Não coletamos intencionalmente dados de crianças sem essa base.',
      ],
    },
    {
      id: 'alteracoes',
      title: '10. Alterações nesta política',
      paragraphs: [
        'Podemos atualizar este documento para refletir mudanças no serviço ou na legislação. A data da última versão aparece no topo da página. Mudanças relevantes podem ser comunicadas por e-mail ou aviso no site.',
      ],
    },
    {
      id: 'contato',
      title: '11. Contato',
      paragraphs: [
        `Encarregado / canal de privacidade: ${COMPANY.privacyEmail}`,
        `Suporte geral: ${COMPANY.supportEmail}`,
      ],
    },
  ],
};
