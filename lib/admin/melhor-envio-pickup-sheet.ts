import { deflateRawSync } from 'node:zlib';
import type { SupabaseClient } from '@supabase/supabase-js';
import { relOne } from '@/lib/dashboard/format';
import {
  parseStandaloneFulfillmentStatus,
  parseStoreOrderMeta,
} from '@/lib/asaas/store-order-payment';
import {
  isStandaloneStoreCardId,
  parseStandaloneStorePaymentId,
} from '@/lib/admin/standalone-store-production';
import { SHIPPING_PARCEL } from '@/lib/shipping/parcel-presets';

export const MELHOR_ENVIO_PICKUP_HEADERS = [
  'CEP DESTINO',
  'PESO (KG)',
  'ALTURA (CM)',
  'LARGURA (CM)',
  'COMPRIMENTO (CM)',
  'AVISO DE RECEBIMENTO (AR)',
  'MÃO PRÓPRIA (MP)',
  'VALOR SEGURADO',
] as const;

const RECEIPT = 'NÃO';
const OWN_HAND = 'NÃO';
const INSURED_VALUE_REAIS = 19;

export type MelhorEnvioPickupRow = {
  postalCode: string;
  weightKg: number;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
  receipt: 'SIM' | 'NÃO';
  ownHand: 'SIM' | 'NÃO';
  insuranceValue: number;
};

type LoadedShipment = {
  postalCode: string | null;
  awaitingPickup: boolean;
};

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (let index = 0; index < buffer.length; index += 1) {
    const byte = buffer[index] ?? 0;
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipFiles(files: { name: string; data: Buffer }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8');
    const compressed = deflateRawSync(file.data);
    const checksum = crc32(file.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, centralDirectory, end]);
}

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function sheetNumber(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}

export function normalizePickupPostalCode(value: string | null | undefined): string | null {
  const digits = (value ?? '').replace(/\D/g, '');
  if (digits.length !== 8) return null;
  return digits;
}

export function toMelhorEnvioPickupRow(input: {
  postalCode: string;
}): MelhorEnvioPickupRow {
  return {
    postalCode: input.postalCode,
    weightKg: SHIPPING_PARCEL.weightKg,
    heightCm: SHIPPING_PARCEL.heightCm,
    widthCm: SHIPPING_PARCEL.widthCm,
    lengthCm: SHIPPING_PARCEL.lengthCm,
    receipt: RECEIPT,
    ownHand: OWN_HAND,
    insuranceValue: INSURED_VALUE_REAIS,
  };
}

export function buildMelhorEnvioPickupXlsx(rows: MelhorEnvioPickupRow[]): Buffer {
  const shared = new Map<string, number>();
  const share = (value: string) => {
    const existing = shared.get(value);
    if (existing != null) return existing;
    const index = shared.size;
    shared.set(value, index);
    return index;
  };

  for (const header of MELHOR_ENVIO_PICKUP_HEADERS) share(header);

  const cells: string[] = [];
  const headerCells = MELHOR_ENVIO_PICKUP_HEADERS.map((header, index) => {
    const column = String.fromCharCode(65 + index);
    return `<c r="${column}1" t="s"><v>${share(header)}</v></c>`;
  });
  cells.push(`<row r="1">${headerCells.join('')}</row>`);

  rows.forEach((row, rowIndex) => {
    const excelRow = rowIndex + 2;
    const values: Array<{ kind: 's' | 'n'; value: string }> = [
      { kind: 's', value: String(share(row.postalCode)) },
      { kind: 'n', value: sheetNumber(row.weightKg) },
      { kind: 'n', value: sheetNumber(row.heightCm) },
      { kind: 'n', value: sheetNumber(row.widthCm) },
      { kind: 'n', value: sheetNumber(row.lengthCm) },
      { kind: 's', value: String(share(row.receipt)) },
      { kind: 's', value: String(share(row.ownHand)) },
      { kind: 'n', value: sheetNumber(row.insuranceValue) },
    ];
    const rowCells = values.map((cell, index) => {
      const ref = `${String.fromCharCode(65 + index)}${excelRow}`;
      if (cell.kind === 's') {
        return `<c r="${ref}" t="s"><v>${cell.value}</v></c>`;
      }
      return `<c r="${ref}"><v>${cell.value}</v></c>`;
    });
    cells.push(`<row r="${excelRow}">${rowCells.join('')}</row>`);
  });

  const sharedItems = Array.from(shared.keys())
    .map((value) => `<si><t xml:space="preserve">${xmlEscape(value)}</t></si>`)
    .join('');

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${cells.join('')}</sheetData>
</worksheet>`;

  const sharedXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${shared.size}" uniqueCount="${shared.size}">${sharedItems}</sst>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Planilha1" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

  return zipFiles([
    { name: '[Content_Types].xml', data: Buffer.from(contentTypes) },
    { name: '_rels/.rels', data: Buffer.from(rootRels) },
    { name: 'xl/workbook.xml', data: Buffer.from(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(workbookRels) },
    { name: 'xl/worksheets/sheet1.xml', data: Buffer.from(sheetXml) },
    { name: 'xl/sharedStrings.xml', data: Buffer.from(sharedXml) },
  ]);
}

export function melhorEnvioPickupFilename(date = new Date()): string {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
  }).format(date);
  return `melhor-envio-coleta-${day}.xlsx`;
}

function postalFromAddress(address: unknown): string | null {
  const row = relOne(address as { zip_code?: string | null } | { zip_code?: string | null }[] | null);
  return normalizePickupPostalCode(row?.zip_code);
}

async function loadCycleShipments(
  admin: SupabaseClient,
  cycleIds: string[]
): Promise<Map<string, LoadedShipment>> {
  const loaded = new Map<string, LoadedShipment>();
  if (cycleIds.length === 0) return loaded;

  const { data, error } = await admin
    .from('subscription_cycles')
    .select(
      `
      id,
      status,
      subscriptions(
        addresses(zip_code)
      )
    `
    )
    .in('id', cycleIds);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const subscription = relOne(
      row.subscriptions as
        | {
            addresses?: { zip_code?: string | null } | { zip_code?: string | null }[] | null;
          }
        | Array<{
            addresses?: { zip_code?: string | null } | { zip_code?: string | null }[] | null;
          }>
        | null
    );
    loaded.set(row.id as string, {
      postalCode: postalFromAddress(subscription?.addresses ?? null),
      awaitingPickup: row.status === 'awaiting_pickup',
    });
  }

  return loaded;
}

async function loadStandaloneShipments(
  admin: SupabaseClient,
  paymentIds: string[]
): Promise<Map<string, LoadedShipment>> {
  const loaded = new Map<string, LoadedShipment>();
  if (paymentIds.length === 0) return loaded;

  const { data, error } = await admin
    .from('payments')
    .select('id, status, status_detail')
    .in('id', paymentIds);

  if (error) throw new Error(error.message);

  const addressIds = new Set<string>();
  const parsed = (data ?? []).map((row) => {
    const meta = parseStoreOrderMeta(row.status_detail);
    if (meta?.addressId) addressIds.add(meta.addressId);
    return { row, meta };
  });

  const addresses = new Map<string, string | null>();
  if (addressIds.size > 0) {
    const { data: addressRows, error: addressError } = await admin
      .from('addresses')
      .select('id, zip_code')
      .in('id', Array.from(addressIds));
    if (addressError) throw new Error(addressError.message);
    for (const address of addressRows ?? []) {
      addresses.set(
        address.id as string,
        normalizePickupPostalCode(address.zip_code as string | null)
      );
    }
  }

  for (const { row, meta } of parsed) {
    loaded.set(row.id as string, {
      postalCode: meta?.addressId ? addresses.get(meta.addressId) ?? null : null,
      awaitingPickup:
        row.status === 'approved' &&
        parseStandaloneFulfillmentStatus(meta) === 'awaiting_pickup',
    });
  }

  return loaded;
}

export async function buildAwaitingPickupMelhorEnvioExport(
  admin: SupabaseClient,
  cardIds: string[]
): Promise<
  | {
      filename: string;
      fileBase64: string;
      exported: number;
      skipped: string[];
    }
  | { error: string }
> {
  const uniqueIds = Array.from(new Set(cardIds.map((id) => id.trim()).filter(Boolean)));
  if (uniqueIds.length === 0) {
    return { error: 'Nenhum pedido aguardando coleta para exportar.' };
  }
  if (uniqueIds.length > 500) {
    return { error: 'Há pedidos demais nesta coluna para exportar de uma vez.' };
  }

  const cycleIds: string[] = [];
  const paymentIds: string[] = [];
  for (const id of uniqueIds) {
    if (isStandaloneStoreCardId(id)) {
      const paymentId = parseStandaloneStorePaymentId(id);
      if (paymentId) paymentIds.push(paymentId);
    } else {
      cycleIds.push(id);
    }
  }

  const [cycles, storeOrders] = await Promise.all([
    loadCycleShipments(admin, cycleIds),
    loadStandaloneShipments(admin, paymentIds),
  ]);

  const rows: MelhorEnvioPickupRow[] = [];
  const skipped: string[] = [];

  for (const id of uniqueIds) {
    const shipment = isStandaloneStoreCardId(id)
      ? storeOrders.get(parseStandaloneStorePaymentId(id) ?? '')
      : cycles.get(id);

    if (!shipment) {
      skipped.push('Pedido não encontrado.');
      continue;
    }
    if (!shipment.awaitingPickup) {
      skipped.push('Pedido não está mais aguardando coleta.');
      continue;
    }
    if (!shipment.postalCode) {
      skipped.push('Pedido sem CEP válido.');
      continue;
    }

    rows.push(
      toMelhorEnvioPickupRow({
        postalCode: shipment.postalCode,
      })
    );
  }

  if (rows.length === 0) {
    return {
      error: 'Nenhum pedido aguardando coleta com CEP válido para exportar.',
    };
  }

  const file = buildMelhorEnvioPickupXlsx(rows);
  return {
    filename: melhorEnvioPickupFilename(),
    fileBase64: file.toString('base64'),
    exported: rows.length,
    skipped,
  };
}
