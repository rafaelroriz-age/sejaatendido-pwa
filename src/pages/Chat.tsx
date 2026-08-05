import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUser, type User } from '../storage/localStorage';
import {
  fetchChatsUsuario,
  fetchMensagensChat,
  enviarMensagem,
  fetchConsultasMedico,
  fetchMinhasConsultas,
  ChatSummary,
  ChatMessage,
} from '../services/api';
import { showErrorAlert } from '../utils/errorHandler';
import { formatConsultaTime } from '../utils/datetime';
import { criarLinkWhatsApp } from '../utils/whatsapp';
import Colors from '../theme/colors';
import { Icon } from '../components/Icon';

export default function Chat() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [userTipo, setUserTipo] = useState<User['tipo'] | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [telefonesPorConsultaId, setTelefonesPorConsultaId] = useState<Record<string, string>>({});
  const [meetLinksPorConsultaId, setMeetLinksPorConsultaId] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getUser().then(u => {
      if (!u) return;
      setUserId(u.id);
      setUserTipo(u.tipo);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetchChatsUsuario(userId)
      .then(setChats)
      .catch(e => showErrorAlert(e, 'Erro ao carregar conversas'))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!userTipo) return;

    const loadTelefones = async () => {
      try {
        if (userTipo === 'MEDICO') {
          const consultas = await fetchConsultasMedico();
          const telefonesMap: Record<string, string> = {};
          const meetLinksMap: Record<string, string> = {};
          consultas.forEach((c) => {
            const telefone = c.paciente?.telefone ?? c.paciente?.usuario?.telefone;
            if (c.id && telefone) telefonesMap[c.id] = telefone;
            if (c.id && c.meetLink) meetLinksMap[c.id] = c.meetLink;
          });
          setTelefonesPorConsultaId(telefonesMap);
          setMeetLinksPorConsultaId(meetLinksMap);
          return;
        }

        if (userTipo === 'PACIENTE') {
          const consultas = await fetchMinhasConsultas();
          const telefonesMap: Record<string, string> = {};
          const meetLinksMap: Record<string, string> = {};
          consultas.forEach((c) => {
            const telefone = c.medico?.usuario?.telefone;
            if (c.id && telefone) telefonesMap[c.id] = telefone;
            if (c.id && c.meetLink) meetLinksMap[c.id] = c.meetLink;
          });
          setTelefonesPorConsultaId(telefonesMap);
          setMeetLinksPorConsultaId(meetLinksMap);
        }
      } catch {
        // O fallback principal e o telefone vindo no payload de chat.
      }
    };

    void loadTelefones();
  }, [userTipo]);

  useEffect(() => {
    const consultaIdDaUrl = new URLSearchParams(location.search).get('consultaId');
    if (!consultaIdDaUrl || chats.length === 0) return;

    const chatSelecionado = chats.find(chat => chat.consultaId === consultaIdDaUrl);
    if (chatSelecionado) {
      setActiveChat(chatSelecionado);
    }
  }, [location.search, chats]);

  const loadMessages = useCallback(async (chatId: string) => {
    try {
      const msgs = await fetchMensagensChat(chatId);
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!activeChat) return;
    loadMessages(activeChat.chatId);
    pollRef.current = setInterval(() => loadMessages(activeChat.chatId), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeChat, loadMessages]);

  async function handleSend() {
    if (!newMessage.trim() || !activeChat || sending) return;
    const texto = newMessage.trim();
    setNewMessage('');
    setSending(true);
    try {
      const msg = await enviarMensagem(activeChat.chatId, texto);
      setMessages(prev => [...prev, msg]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (e) {
      showErrorAlert(e, 'Erro ao enviar mensagem');
      setNewMessage(texto);
    } finally {
      setSending(false);
    }
  }

  function getTelefoneOutraParte(chat: ChatSummary): string | undefined {
    return chat.outraParte?.telefone ?? telefonesPorConsultaId[chat.consultaId];
  }

  function extractMeetingLinks(texto: string): string[] {
    const urls = (texto.match(/https?:\/\/[^\s)>"]+/gi) ?? [])
      .map(url => url.replace(/[).,;]+$/, ''));
    return urls.filter(url => /meet|jitsi|zoom|teams|whereby|google\.com|discord|video/i.test(url));
  }

  function getPrimaryMeetingLink(chat: ChatSummary | null, msgs: ChatMessage[]): string | undefined {
    if (!chat) return undefined;
    for (const msg of msgs) {
      const links = extractMeetingLinks(msg.texto);
      if (links.length > 0) return links[0];
    }
    return meetLinksPorConsultaId[chat.consultaId];
  }

  function handleAbrirWhatsApp(chat: ChatSummary) {
    const telefone = getTelefoneOutraParte(chat);
    const nome = chat.outraParte?.nome || 'profissional';
    const link = criarLinkWhatsApp(telefone ?? '', {
      message: `Ola, ${nome}. Estou te chamando pelo chat da consulta no Seja Atendido.`,
    });

    if (!link) {
      showErrorAlert(new Error('Telefone da outra parte indisponivel ou invalido.'), 'WhatsApp indisponivel');
      return;
    }

    window.open(link, '_blank', 'noopener,noreferrer');
  }

  if (!activeChat) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
        <div style={{ backgroundColor: Colors.primary, padding: '28px 16px 16px', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => navigate(-1)} style={{ color: '#fff', fontSize: 15, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>Mensagens</span>
          <div style={{ width: 60 }} />
        </div>
        <div style={{ padding: 16 }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div className="spinner" />
            </div>
          )}
          {!loading && chats.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Icon name="message-circle" size={40} color={Colors.textMuted} /></div>
              <div style={{ fontSize: 15, fontWeight: 700, color: Colors.textPrimary }}>Nenhuma conversa ainda</div>
              <div style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 6 }}>Suas conversas de consulta aparecerão aqui.</div>
            </div>
          )}
          {chats.map(c => (
            <div key={c.chatId} onClick={() => setActiveChat(c)} style={{
              display: 'flex', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 16,
              padding: 14, marginBottom: 10, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <div style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>
                  {(c.outraParte?.nome || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: Colors.textPrimary }}>{c.outraParte?.nome || 'Conversa'}</span>
                  {c.atualizadoEm && (
                    <span style={{ fontSize: 12, color: Colors.textMuted }}>
                      {formatConsultaTime(c.atualizadoEm)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: Colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>
                    {c.ultimaMensagem || '...'}
                  </span>
                  {!!c.naoLidas && (
                    <span style={{ backgroundColor: Colors.primary, borderRadius: 12, minWidth: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', color: '#fff', fontSize: 12, fontWeight: 800 }}>
                      {c.naoLidas}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const primaryMeetLink = getPrimaryMeetingLink(activeChat, messages);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: Colors.bg }}>
      <div style={{ backgroundColor: Colors.primary, padding: '28px 16px 16px', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <button onClick={() => setActiveChat(null)} style={{ color: '#fff', fontSize: 15, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>{activeChat.outraParte?.nome || 'Conversa'}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {primaryMeetLink && (
            <button
              onClick={() => window.open(primaryMeetLink, '_blank', 'noopener,noreferrer')}
              style={{
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                background: 'rgba(255,255,255,0.16)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 14,
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              aria-label="Abrir reunião"
              title="Abrir reunião"
            >
              <Icon name="calendar" size={14} color="#fff" />
              Reunião
            </button>
          )}
          <button
            onClick={() => handleAbrirWhatsApp(activeChat)}
            disabled={!getTelefoneOutraParte(activeChat)}
            style={{
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              background: 'rgba(255,255,255,0.16)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 14,
              padding: '6px 10px',
              cursor: getTelefoneOutraParte(activeChat) ? 'pointer' : 'not-allowed',
              opacity: getTelefoneOutraParte(activeChat) ? 1 : 0.6,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            aria-label="Abrir conversa no WhatsApp"
            title={getTelefoneOutraParte(activeChat) ? 'Abrir conversa no WhatsApp' : 'Telefone indisponível'}
          >
            <Icon name="message-circle" size={14} color="#fff" />
            WhatsApp
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.map(m => {
          const isMine = m.remetente.id === userId;
          return (
            <div key={m.id} style={{
              maxWidth: '78%', borderRadius: 18, padding: 14, marginBottom: 8,
              ...(isMine
                ? { backgroundColor: Colors.primary, marginLeft: 'auto', borderBottomRightRadius: 4, color: '#fff' }
                : { backgroundColor: Colors.card, marginRight: 'auto', borderBottomLeftRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }
              ),
            }}>
              <div style={{ fontSize: 15, lineHeight: '21px', color: isMine ? '#fff' : Colors.textPrimary }}>{m.texto}</div>
              <div style={{ fontSize: 11, marginTop: 4, textAlign: 'right', color: isMine ? 'rgba(255,255,255,0.7)' : Colors.textMuted }}>
                {formatConsultaTime(m.criadoEm)}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 12px 28px', backgroundColor: Colors.card, borderTop: `1px solid ${Colors.borderLight}`, flexShrink: 0 }}>
        <input
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Digite sua mensagem..."
          disabled={sending}
          style={{ flex: 1, backgroundColor: Colors.inputBg, borderRadius: 24, padding: '12px 18px', fontSize: 15, color: Colors.textPrimary, border: 'none', outline: 'none', marginRight: 10 }}
        />
        <button
          onClick={handleSend}
          disabled={sending}
          style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.primary, border: 'none', color: '#fff', fontSize: 20, cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: sending ? 0.6 : 1 }}
        >›</button>
      </div>
    </div>
  );
}
