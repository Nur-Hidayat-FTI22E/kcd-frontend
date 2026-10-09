// app.js — client-side soup untuk demo frontend
// 1) SSE live feed di halaman products
// 2) toast kecil
(function () {
  const streamEl = document.getElementById("sse-stream");

  function startSSE() {
    const es = new EventSource("/api/stream");
    es.onopen = () => { if (streamEl) streamEl.textContent = "🟢 tersambung ke backend via proxy…\n"; };
    es.onmessage = (e) => {
      if (streamEl) streamEl.textContent += `${new Date().toLocaleTimeString()}  ${e.data}\n`;
    };
    es.onerror = () => {
      if (streamEl) streamEl.textContent += "… menyambung ulang\n";
    };
  }
  if (streamEl) startSSE();

  // konfirmasi hapus
  document.querySelectorAll("form[action='/products/delete']").forEach((f) => {
    f.addEventListener("submit", (e) => {
      if (!confirm("Hapus note ini?")) e.preventDefault();
    });
  });
})();
