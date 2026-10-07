# Identidade visual — EspelhoMeu

Identidade oficial definida por Atlas em 07/10/2026. Os ficheiros originais (1254×1254 px) estão no Google Drive da equipa,
pasta `00_MASTER` e `01_IDENTIDADE_VISUAL`; aqui ficam só as regras e as versões usadas pelo site.

## Elementos

- **Logo principal**: espelho oval de pé em rose-gold/cobre, com ondas de fala a sair da moldura (o espelho "fala"),
  wordmark serifado "EspelhoMeu" e tagline **"O espelho que me conhece"**. No site: `apps/web/public/marca/logo-principal-800.webp`.
- **Emblema**: só o espelho, sem letras. Usado em favicons e ícones (`apps/web/src/app/icon1.png`, `icon2.png`, `apple-icon.png`).
- **Avatar de perfil**: versão circular com fundo, para redes sociais. O avatar quadrado oficial corta o wordmark num círculo;
  usar a versão circular do emblema.

## Regras de uso

- O logo tem brilho semitransparente nas bordas: **só sobre fundos claros** (champagne, creme, mármore), nunca escuros.
- Não recortar, deformar, recolorir nem acrescentar efeitos ao logo.
- Em tamanhos muito pequenos (abaixo de ~32 px) usar o emblema, não o logo completo.
- O logo e os banners oficiais repetem um rosto gerado por IA. Para mostrar diversidade usar figuras sem rosto ou fotos reais
  com consentimento, não mais variações desse rosto.

## Cores (tokens em `apps/web/src/app/globals.css`)

| Token | Hex | Uso |
| --- | --- | --- |
| `champagne` | `#F8F1E9` | Fundo principal |
| `cream` | `#FBF7F2` | Fundo claro, realces |
| `marble` | `#EFE5DA` | Fundo secundário |
| `ink` | `#3B2419` | Texto |
| `ink-soft` | `#7A5644` | Texto secundário |
| `copper` | `#B06A43` | Destaques, chamadas |
| `copper-deep` | `#8A4A2B` | Títulos em destaque, erros |
| `rose-gold` | `#D9A383` | Detalhes decorativos |

## Tipografia

- Títulos: serifada de alto contraste (Bodoni Moda no site), em itálico para as frases de assinatura.
- Texto: Jost (sans geométrica, leve). Caixa alta espaçada para linhas curtas como "Observe. Experimente. Escolha."

## Linhas de assinatura

- "Espelho meu, espelho meu. Hoje, eu me escolho."
- "O espelho que me conhece."
- "Observe. Experimente. Escolha."
- "Não para decidir por mim. Para me ajudar a escolher."
