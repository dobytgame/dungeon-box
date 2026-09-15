import { buildWhatsAppChatUrl } from '@/lib/whatsapp/chat';

/** Incrementar para reexibir o comunicado depois de uma atualização. */
export const CORREIOS_STRIKE_NOTICE_KEY = 'dbx_correios_strike_notice_v1';

export const CORREIOS_STRIKE_IMAGE = '/images/greve-correios.jpg';

export const CORREIOS_STRIKE_TITLE = '📦 COMUNICADO DUNGEONBOX';

export const CORREIOS_STRIKE_PARAGRAPHS = [
  'Pessoal, passando para deixar vocês informados sobre uma situação que pode impactar pontualmente os prazos de entrega dos kits.',
  'Apesar de a DungeonBox não utilizar os Correios para o envio dos kits, a atual greve está gerando uma sobrecarga nas transportadoras, devido ao aumento no volume de coletas e encomendas. Com isso, alguns pedidos podem sofrer pequenos atrasos no transporte.',
  'Além disso, a greve também acaba impactando diretamente a DungeonBox no recebimento de matérias-primas e materiais de embalagem que utilizamos em nossa produção.',
  'Mas fiquem tranquilos! 💪 Estamos acompanhando a situação de perto e buscando alternativas e soluções para evitar que isso prejudique nosso processo de produção e, principalmente, as entregas de vocês.',
  'Nosso compromisso continua sendo produzir e enviar os kits da melhor forma possível e dentro dos prazos informados. ❤️',
  'Agradecemos muito a compreensão e a paciência de todos nesse período. Assim que houver qualquer mudança relevante que possa afetar os pedidos, manteremos vocês informados.',
  'Obrigado por fazerem parte da DungeonBox! 🐉🎲',
] as const;

export const CORREIOS_STRIKE_WHATSAPP_URL = buildWhatsAppChatUrl(
  'Olá! Vi o comunicado sobre a greve dos Correios e tenho uma dúvida sobre a entrega do meu kit.'
);
