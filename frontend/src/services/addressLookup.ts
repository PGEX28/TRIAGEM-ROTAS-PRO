import axios from 'axios';

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

export const fetchAddressByZip = async (zipCode: string): Promise<ViaCepResponse | null> => {
  const cleanZip = zipCode.replace(/\D/g, '');
  
  if (cleanZip.length !== 8) return null;
  
  try {
    const response = await axios.get(`https://viacep.com.br/ws/${cleanZip}/json/`);
    if (response.data.erro) {
      return null;
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching address from ViaCEP:', error);
    return null;
  }
};
