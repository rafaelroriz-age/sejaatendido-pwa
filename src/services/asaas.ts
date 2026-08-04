import axios from 'axios';
import { ASAAS_API_URL, ASAAS_TOKENIZATION_KEY } from '../config/asaas';

// Cliente dedicado à tokenização de cartão diretamente no gateway Asaas.
// Importante: nunca reutilizar a instância axios de services/api.ts aqui —
// esta chamada vai para o Asaas (não para o backend do SejaAtendido) e não
// deve carregar o header Authorization: Bearer <accessToken> da nossa API.

export interface TokenizeCreditCardRequest {
  creditCard: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone: string;
  };
}

export interface TokenizeCreditCardResponse {
  creditCardNumber: string;
  creditCardBrand: string;
  creditCardToken: string;
}

export async function tokenizeCreditCard(data: TokenizeCreditCardRequest): Promise<TokenizeCreditCardResponse> {
  if (!ASAAS_TOKENIZATION_KEY) {
    throw new Error('Pagamento com cartão indisponível: chave de tokenização do Asaas não configurada.');
  }

  const response = await axios.post(
    `${ASAAS_API_URL}/v3/creditCard/tokenizeCreditCard`,
    data,
    {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        access_token: ASAAS_TOKENIZATION_KEY,
      },
    },
  );

  return response.data;
}
