using System.Text.Json.Serialization;

namespace SameSpot.Api.Services;

// Los grupos locales no existen en Spotify: su música vive en YouTube o
// SoundCloud. Validamos el enlace contra el oEmbed público de cada
// plataforma (sin API key): si responde, el contenido existe y de paso
// nos regala la miniatura para la tarjeta.
public class MediaLinkService(HttpClient http)
{
    public record MediaLinkInfo(string Url, string? ThumbnailUrl);

    private record OEmbedDto(
        [property: JsonPropertyName("title")] string? Title,
        [property: JsonPropertyName("thumbnail_url")] string? ThumbnailUrl);

    public Task<MediaLinkInfo?> ResolveYoutubeAsync(string url) =>
        ResolveAsync(url, "https://www.youtube.com/oembed");

    public Task<MediaLinkInfo?> ResolveSoundcloudAsync(string url) =>
        ResolveAsync(url, "https://soundcloud.com/oembed");

    private async Task<MediaLinkInfo?> ResolveAsync(string url, string oembedEndpoint)
    {
        var normalized = Normalize(url)!;
        var response = await http.GetAsync(
            $"{oembedEndpoint}?url={Uri.EscapeDataString(normalized)}&format=json");
        if (!response.IsSuccessStatusCode) return null;

        var data = await response.Content.ReadFromJsonAsync<OEmbedDto>();
        return new MediaLinkInfo(normalized, data?.ThumbnailUrl);
    }

    // Validación de dominio, pura y testeable: solo aceptamos enlaces que
    // de verdad sean de la plataforma que dicen ser
    public static bool IsYoutubeUrl(string url) =>
        HostOf(url) is "youtube.com" or "www.youtube.com" or "m.youtube.com"
            or "music.youtube.com" or "youtu.be";

    public static bool IsSoundcloudUrl(string url) =>
        HostOf(url) is "soundcloud.com" or "www.soundcloud.com" or "on.soundcloud.com";

    private static string? HostOf(string url) =>
        Uri.TryCreate(Normalize(url), UriKind.Absolute, out var uri)
            && uri.Scheme == Uri.UriSchemeHttps
            ? uri.Host
            : null;

    // Sin esquema ("youtube.com/...") o con http, lo llevamos a https
    private static string? Normalize(string? url)
    {
        var trimmed = url?.Trim();
        if (string.IsNullOrEmpty(trimmed)) return null;
        if (trimmed.StartsWith("http://")) return $"https://{trimmed["http://".Length..]}";
        if (!trimmed.StartsWith("https://")) return $"https://{trimmed}";
        return trimmed;
    }
}
