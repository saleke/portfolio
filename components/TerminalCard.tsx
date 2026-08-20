export function TerminalCard() {
  return (
    <div className="terminal-card" aria-label="Terminal identity card">
      <div className="terminal-bar"><span /><span /><span /><small>identity.sh</small></div>
      <div className="terminal-body">
        <p><span className="prompt">$</span> whoami</p>
        <p className="terminal-value">software-developer-in-training</p>
        <p><span className="prompt">$</span> focus</p>
        <p className="terminal-value">full stack web development / AI integration</p>
        <p><span className="prompt">$</span> status <span className="cursor" aria-hidden="true">_</span></p>
      </div>
    </div>
  );
}
