## Kona supported image formats

The following image formats are guaranteed to be supported by Kona:

| Format | Codec        | Code[^1] | Read | Write[^2] |
|--------|--------------|----------|------|--------|
| PNG    | PNG          | PNG      | ☑    | 
| PNG    | APNG         | APNG     | ☑    | 
| JPEG   | JPEG         | JPEG     | ☑    |
| GIF    | GIF          | GIF      | ☑    |
| JXL    | JXL          | JXL      | ☑    |
| WEBP   | WEBP         | WEBP     | ☑    |
| HEIF   | AV1          | AVIF     | ☑    |
| HEIF   | HEVC         | HEIC     | ☑    |
| MP4    | *ffmpeg*[^3] | MP4      | ☑    |
| MOV    | *ffmpeg*[^3] | MOV      | ☑    |
| 3GP    | *ffmpeg*[^3] | 3GP      | ☑    |
| 3G2    | *ffmpeg*[^3] | 3G2      | ☑    |

[^1]: This code is returned on API calls.
[^2]: Work in progress, there is no output yet.
[^3]: Kona uses [ffmpeg](https://ffmpeg.org/) to read this format. Video codecs supported by ffmpeg (H.264, H.265, ...) are supported by Kona.

Additionally, Kona may support additional formats that is supported by [ImageMagick](https://imagemagick.org/script/formats.php) and [ffmpeg](https://ffmpeg.org/). However, these formats not included in the list above are not guranteed to be supported.

**USAGE OF FORMATS/CODECS NOT INCLUDED IN THE LIST ABOVE IS AT YOUR OWN RISK.**
