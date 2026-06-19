import { IconSend } from '@tabler/icons-react';

const messages = [
  { initials: 'RK', name: 'Rina Kusuma', role: 'Sales', time: '09:15', message: 'David, client sent updated brand guidelines. Please check Space Files.' },
  { initials: 'DS', name: 'You', role: 'Designer', time: '09:22', message: 'Got it. Color palette updated to forest green. Proposal update today.', mine: true },
  { initials: 'PK', name: 'PT Kopi Nusantara', role: 'Customer', time: '10:05', message: 'Can we add a living plant wall behind the counter? Like a vertical garden?' },
  { initials: 'DS', name: 'You', role: 'Designer', time: '10:12', message: "Great idea. I'll add a modular plant wall in Scene 02. Update by tomorrow EOD.", mine: true },
  { initials: 'RK', name: 'Rina Kusuma', role: 'Sales', time: '10:45', message: 'Also check bar counter dimensions. Client wants 220-240 cm for 3 barista stations.' },
];

export function ChatTab() {
  return (
    <section className="designer-card designer-project-chat-card">
      <div className="border-b border-zinc-100 p-6">
        <h3 className="text-lg font-semibold text-zinc-950">Project Chat</h3>
        <p className="mt-1 text-sm text-zinc-500">Shared conversation with sales and customer.</p>
      </div>
      <div className="designer-project-message-list">
        {messages.map((message) => (
          <div className={`designer-project-message ${message.mine ? 'designer-project-message-mine' : ''}`} key={`${message.name}-${message.time}`}>
            <div className="designer-project-message-avatar">{message.initials}</div>
            <div className="designer-project-message-bubble">
              <div className="designer-project-message-meta">
                <strong>{message.name}</strong>
                <span>{message.role}</span>
                <span>{message.time}</span>
              </div>
              <p>{message.message}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="designer-project-chat-input">
        <input placeholder="Type a message..." type="text" />
        <button type="button">
          <span>Send</span>
          <IconSend size={17} />
        </button>
      </div>
    </section>
  );
}
