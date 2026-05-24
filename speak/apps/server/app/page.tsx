export default function Home() {
  const hasKey = Boolean(process.env.NVIDIA_API_KEY);
  return (
    <main>
      <h1>speak — server</h1>
      <p>Routes:</p>
      <ul>
        <li><code>POST /api/asr</code> &nbsp; multipart with <code>file</code> field → <code>{`{text}`}</code></li>
        <li><code>POST /api/chat</code> &nbsp; JSON <code>{`{messages}`}</code> → <code>{`{text}`}</code></li>
        <li><code>POST /api/tts</code> &nbsp; JSON <code>{`{text}`}</code> → <code>audio/wav</code></li>
      </ul>
      <p>NVIDIA_API_KEY: <strong>{hasKey ? "configured" : "MISSING"}</strong></p>
    </main>
  );
}
