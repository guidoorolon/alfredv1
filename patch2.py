import re

files = ['main.html', 'gym.html', 'health.html', 'po-water.html', 'finance.html', 'caffeine.html', 'avatar-lab.html']

new_root = ''':root {
  --text-primary: var(--clr-text-1);
  --text-secondary: var(--clr-text-2);
  --text-tertiary: var(--clr-text-3);
  --success: var(--clr-ok);
  --warning: var(--clr-warn);
  --danger: var(--clr-danger);
  --font: var(--font-body);
  --font-mono: var(--font-mono);
  --accent: var(--clr-cyan);
  --bg: var(--clr-bg);
  --surface: var(--clr-surface);
  --line: rgba(0, 212, 255, 0.12);
}'''

for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
            
        # Fix encoding issue from previous run if any
        content = content.replace('Alfred ?" Dashboard', 'Alfred — Dashboard')
        
        # Replace :root { ... } up to the closing brace
        content = re.sub(r':root\s*\{[^}]*\}', new_root, content)
        
        # Override background in html, body rules
        content = re.sub(r'background:\s*#[0-9a-fA-F]{3,6};', 'background: transparent;', content)
        
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
            
        print(f"Patched root in {f}")
    except Exception as e:
        print(f"Error {f}: {e}")
