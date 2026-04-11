import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Colors from '../theme/colors';

interface Message { id: string; text: string; sender: 'user' | 'other'; time: string; }
interface Contact { id: string; name: string; lastMessage: string; time: string; unread: number; }

const CONTACTS: Contact[] = [
  { id: '1', name: 'Dr. Carlos Silva', lastMessage: 'Até a próxima consulta!', time: '10:30', unread: 2 },
  { id: '2', name: 'Dra. Ana Souza', lastMessage: 'Os exames ficaram ótimos', time: 'Ontem', unread: 0 },
  { id: '3', name: 'Dr. Paulo Mendes', lastMessage: 'Enviei a receita', time: 'Seg', unread: 1 },
];

const MESSAGES: Message[] = [
  { id: '1', text: 'Olá doutor, tudo bem?', sender: 'user', time: '10:00' },
  { id: '2', text: 'Olá! Tudo sim, como posso ajudar?', sender: 'other', time: '10:05' },
  { id: '3', text: 'Gostaria de tirar uma dúvida sobre o tratamento', sender: 'user', time: '10:10' },
  { id: '4', text: 'Claro, pode perguntar!', sender: 'other', time: '10:12' },
  { id: '5', text: 'Posso tomar o medicamento com alimento?', sender: 'user', time: '10:15' },
  { id: '6', text: 'Sim, é recomendável tomar após as refeições para evitar desconforto gástrico.', sender: 'other', time: '10:20' },
];

export default function Chat() {
  const navigate = useNavigate();
  const [activeChat, setActiveChat] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>(MESSAGES);
  const [newMessage, setNewMessage] = useState('');

  function handleSend() {
    if (!newMessage.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now().toString(), text: newMessage.trim(), sender: 'user',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }]);
    setNewMessage('');
  }

  if (!activeChat) return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      <div style={{ backgroundColor: Colors.primary, padding: '28px 16px 16px', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ color: '#fff', fontSize: 15, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>Mensagens</span>
        <div style={{ width: 60 }} />
      </div>
      <div style={{ padding: 16 }}>
        {CONTACTS.map(c => (
          <div key={c.id} onClick={() => setActiveChat(c)} style={{
            display: 'flex', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 16,
            padding: 14, marginBottom: 10, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            <div style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 }}>
              <span style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>{c.name.charAt(0)}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: Colors.textPrimary }}>{c.name}</span>
                <span style={{ fontSize: 12, color: Colors.textMuted }}>{c.time}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: Colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>{c.lastMessage}</span>
                {c.unread > 0 && <span style={{ backgroundColor: Colors.primary, borderRadius: 12, minWidth: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', color: '#fff', fontSize: 12, fontWeight: 800 }}>{c.unread}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: Colors.bg }}>
      <div style={{ backgroundColor: Colors.primary, padding: '28px 16px 16px', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <button onClick={() => setActiveChat(null)} style={{ color: '#fff', fontSize: 15, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>{activeChat.name}</span>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {messages.map(m => (
          <div key={m.id} style={{
            maxWidth: '78%', borderRadius: 18, padding: 14, marginBottom: 8,
            ...(m.sender === 'user'
              ? { backgroundColor: Colors.primary, marginLeft: 'auto', borderBottomRightRadius: 4, color: '#fff' }
              : { backgroundColor: Colors.card, marginRight: 'auto', borderBottomLeftRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }
            ),
          }}>
            <div style={{ fontSize: 15, lineHeight: '21px', color: m.sender === 'user' ? '#fff' : Colors.textPrimary }}>{m.text}</div>
            <div style={{ fontSize: 11, marginTop: 4, textAlign: 'right', color: m.sender === 'user' ? 'rgba(255,255,255,0.7)' : Colors.textMuted }}>{m.time}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 12px 28px', backgroundColor: Colors.card, borderTop: `1px solid ${Colors.borderLight}`, flexShrink: 0 }}>
        <input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Digite sua mensagem..." style={{ flex: 1, backgroundColor: Colors.inputBg, borderRadius: 24, padding: '12px 18px', fontSize: 15, color: Colors.textPrimary, border: 'none', outline: 'none', marginRight: 10 }} />
        <button onClick={handleSend} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.primary, border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
      </div>
    </div>
  );
}
