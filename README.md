# altro

> human and ai for good

`altro` is an open-source home for small, useful human + AI projects. It's
public and MIT-licensed — fork it, learn from it, build on it.

## What's inside

| Path | What it is |
|------|-----------|
| [`speak/`](./speak) | A full-duplex, voice-to-voice app powered by NVIDIA PersonaPlex (Moshi) speech-to-speech. Web, desktop (Electron), and mobile (Expo) clients sharing one protocol. |

See [`speak/README.md`](./speak/README.md) for its architecture and
[`speak/DEPLOY.md`](./speak/DEPLOY.md) for how to run it.

## Getting started

`speak` is a Node workspace:

```bash
cd speak
npm install
cp apps/server/.env.example apps/server/.env.local   # set PERSONAPLEX_WS_URL
npm run dev:server                                   # http://localhost:3001
```

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) for how to
file issues and open pull requests, and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
for the ground rules.

## License

[MIT](./LICENSE) © aurelius-meshugaim
