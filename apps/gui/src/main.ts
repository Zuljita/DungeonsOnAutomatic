const el = document.getElementById('app')!;
el.innerHTML = `
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; }
    .wrap { max-width: 720px; margin: 0 auto; }
    h1 { margin-bottom: .5rem; }
    p { opacity: .8; }
  </style>
  <div class="wrap">
    <h1>DOA GUI</h1>
    <p>Vite dev server is running. Wire generator calls here.</p>
  </div>
`;
