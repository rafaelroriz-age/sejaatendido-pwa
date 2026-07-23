import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CrmValidation from './CrmValidation';

const fetchCrmStatusMock = vi.fn();
const validarCrmCarteiraMock = vi.fn();
const validarCrmQrMock = vi.fn();
const getUserMock = vi.fn();
const saveUserMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('../services/api', () => ({
  fetchCrmStatus: (...args: unknown[]) => fetchCrmStatusMock(...args),
  validarCrmCarteira: (...args: unknown[]) => validarCrmCarteiraMock(...args),
  validarCrmQr: (...args: unknown[]) => validarCrmQrMock(...args),
}));

vi.mock('../storage/localStorage', () => ({
  getUser: (...args: unknown[]) => getUserMock(...args),
  saveUser: (...args: unknown[]) => saveUserMock(...args),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderCrmValidation() {
  return render(
    <MemoryRouter>
      <CrmValidation />
    </MemoryRouter>,
  );
}

function makePdfFile(name = 'carteira-crm.pdf', sizeBytes = 1024) {
  const file = new File([new Uint8Array(sizeBytes)], name, { type: 'application/pdf' });
  return file;
}

async function selectFile(file: File) {
  const input = await screen.findByLabelText(/selecionar arquivo pdf|reenviar pdf da carteira/i);
  fireEvent.change(input, { target: { files: [file] } });
}

describe('CrmValidation — upload de PDF da carteira (fluxo principal)', () => {
  beforeEach(() => {
    fetchCrmStatusMock.mockReset();
    validarCrmCarteiraMock.mockReset();
    validarCrmQrMock.mockReset();
    getUserMock.mockReset();
    saveUserMock.mockReset();
    navigateMock.mockReset();
    fetchCrmStatusMock.mockResolvedValue({ crmCartaoValidado: false, crmCartaoOrigem: null });
    getUserMock.mockResolvedValue({ id: 'medico-1', nome: 'Dr. Teste', email: 'x@x.com', tipo: 'MEDICO' });
  });

  it('envia um PDF válido e exibe o status aprovado retornado pelo backend', async () => {
    validarCrmCarteiraMock.mockResolvedValue({
      mensagem: 'Carteira CRM validada com sucesso',
      crmCartaoValidado: true,
      crmCartaoOrigem: 'PDF_CARTEIRA',
      statusAprovacao: 'APROVADO',
      crmNumero: '123456',
      crmUf: 'SP',
    });

    renderCrmValidation();

    await selectFile(makePdfFile());
    const enviarBtn = await screen.findByRole('button', { name: /enviar arquivo/i });
    fireEvent.click(enviarBtn);

    await waitFor(() => expect(validarCrmCarteiraMock).toHaveBeenCalledTimes(1));
    expect(validarCrmCarteiraMock).toHaveBeenCalledWith(expect.any(File));

    expect(await screen.findByText('CRM Validado')).toBeInTheDocument();
    expect(screen.getByText('123456')).toBeInTheDocument();
    expect(screen.getByText('SP')).toBeInTheDocument();
    expect(saveUserMock).toHaveBeenCalledWith(expect.objectContaining({ crmCartaoValidado: true }));
  });

  it('rejeita no cliente um arquivo que não é PDF, sem chamar o backend', async () => {
    renderCrmValidation();

    const arquivoTexto = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });
    await selectFile(arquivoTexto);

    expect(await screen.findByRole('alert')).toHaveTextContent(/formato pdf/i);
    expect(validarCrmCarteiraMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /enviar arquivo/i })).not.toBeInTheDocument();
  });

  it('rejeita no cliente um PDF maior que 5MB, sem chamar o backend', async () => {
    renderCrmValidation();

    const arquivoGrande = makePdfFile('carteira-grande.pdf', 6 * 1024 * 1024);
    await selectFile(arquivoGrande);

    expect(await screen.findByRole('alert')).toHaveTextContent(/5MB/i);
    expect(validarCrmCarteiraMock).not.toHaveBeenCalled();
  });

  it('trata o erro 422 (CRM/UF não reconhecidos) com mensagem específica', async () => {
    validarCrmCarteiraMock.mockRejectedValue({
      response: { status: 422, data: { mensagem: 'Não foi possível reconhecer o CRM no PDF' } },
      isAxiosError: true,
    });

    renderCrmValidation();

    await selectFile(makePdfFile());
    const enviarBtn = await screen.findByRole('button', { name: /enviar arquivo/i });
    fireEvent.click(enviarBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível reconhecer o crm no pdf/i);
  });

  it('trata o erro 409 (CRM duplicado) orientando contato com o suporte', async () => {
    validarCrmCarteiraMock.mockRejectedValue({
      response: { status: 409, data: {} },
      isAxiosError: true,
    });

    renderCrmValidation();

    await selectFile(makePdfFile());
    const enviarBtn = await screen.findByRole('button', { name: /enviar arquivo/i });
    fireEvent.click(enviarBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(/suporte/i);
  });

  it('trata o erro 400 (arquivo inválido no servidor) com mensagem específica', async () => {
    validarCrmCarteiraMock.mockRejectedValue({
      response: { status: 400, data: {} },
      isAxiosError: true,
    });

    renderCrmValidation();

    await selectFile(makePdfFile());
    const enviarBtn = await screen.findByRole('button', { name: /enviar arquivo/i });
    fireEvent.click(enviarBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(/pdf válido de até 5mb/i);
  });

  it('mantém o fluxo legado de QR Code acessível, porém oculto por padrão', async () => {
    renderCrmValidation();

    expect(await screen.findByText(/prefere colar o qr code\?/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /escanear qr da carteirinha/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/prefere colar o qr code\?/i));

    expect(await screen.findByRole('button', { name: /escanear qr da carteirinha/i })).toBeInTheDocument();
  });
});
