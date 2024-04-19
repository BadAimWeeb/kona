import { MagickFormat } from "@imagemagick/magick-wasm";

export const ExtMapping: Record<string, MagickFormat> = {
    ".jxl": MagickFormat.Jxl,
    ".webp": MagickFormat.WebP,
    ".png": MagickFormat.Png,
    ".jpg": MagickFormat.Jpeg,
    ".gif": MagickFormat.Gif
}

export const PriorityFormat: MagickFormat[] = [
    MagickFormat.Jxl,
    MagickFormat.WebP,
    MagickFormat.Jpeg
];

export const FormatToMIME: Record<string, string> = {
    [MagickFormat.Jxl]: "image/jxl",
    [MagickFormat.WebP]: "image/webp",
    [MagickFormat.Png]: "image/png",
    [MagickFormat.Jpeg]: "image/jpeg",
    [MagickFormat.Gif]: "image/gif"
}
