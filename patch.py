# -*- coding: utf-8 -*-
import re

files = ['main.html', 'gym.html', 'health.html', 'po-water.html', 'finance.html', 'caffeine.html', 'avatar-lab.html']

translations = {
    'Rowans Dashboard': 'Alfred — Dashboard',
    'Main': 'Misiones',
    'Fitness': 'Entrenamiento',
    'Health': 'Salud',
    'Water': 'Hidratación',
    'Finance': 'Finanzas',
    'Caffeine': 'Cafeína',
    'Nova': 'Alfred'
}

for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
            
        content = re.sub(r'<script src="lock\.js"></script>\s*', '', content)
        
        alfred_head = '''<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/alfred.css">'''

        if '<link rel="stylesheet" href="/assets/alfred.css">' not in content:
            content = re.sub(r'<title>.*?</title>', f'<title>Alfred — Dashboard</title>\\n{alfred_head}', content)
            
        auth_script = '''<script>
window.addEventListener('DOMContentLoaded', async () => {
  if (typeof window.requireAuth === 'function') {
    await window.requireAuth();
  }
});
</script>'''
        if 'window.requireAuth' not in content:
            content = re.sub(r'</body>', f'{auth_script}\\n</body>', content)
            
        for eng, spa in translations.items():
            content = content.replace(f">{eng}<", f">{spa}<")
            
        content = content.replace('lang="en"', 'lang="es"')
            
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
            
        print(f"Patched {f}")
    except Exception as e:
        print(f"Error {f}: {e}")
