import { digitsOnly } from './masks';

export interface ViaCepResult {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

/** Busca endereço pelo CEP na API ViaCEP (Brasil). */
export async function fetchAddressByCep(cep: string): Promise<ViaCepResult | null> {
  const digits = digitsOnly(cep);
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.erro) return null;

    return {
      street: json.logradouro ?? '',
      neighborhood: json.bairro ?? '',
      city: json.localidade ?? '',
      state: json.uf ?? '',
    };
  } catch {
    return null;
  }
}
