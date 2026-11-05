/**
 * Twitter image = sama dengan kartu Open Graph situs.
 * Konvensi file `twitter-image` terpisah; generatornya direuse agar
 * kedua meta (og:image & twitter:image) selalu konsisten.
 */
export { alt, size, contentType, default } from "./opengraph-image";
