using System.Net;
using System.Net.Http.Headers;
using System.Text.Json.Serialization;

namespace SameSpot.Api.Services;

// Llama a la Web API de Spotify en nombre de un usuario. El token siempre
// sale de SpotifyTokenService, que lo renueva si hace falta.
public class SpotifyApiService(HttpClient http, SpotifyTokenService tokenService)
{
    private const int TopLimit = 20;

    public async Task<List<SpotifyArtistDto>> GetTopArtistsAsync(Guid userId)
    {
        var response = await GetAsync<SpotifyPage<SpotifyArtistDto>>(
            userId, $"https://api.spotify.com/v1/me/top/artists?limit={TopLimit}&time_range=medium_term");
        return response?.Items ?? [];
    }

    public async Task<List<SpotifyTrackDto>> GetTopTracksAsync(Guid userId)
    {
        var response = await GetAsync<SpotifyPage<SpotifyTrackDto>>(
            userId, $"https://api.spotify.com/v1/me/top/tracks?limit={TopLimit}&time_range=medium_term");
        return response?.Items ?? [];
    }

    // Devuelve null si el usuario no está escuchando nada (Spotify responde 204)
    public async Task<SpotifyNowPlayingDto?> GetNowPlayingAsync(Guid userId)
    {
        return await GetAsync<SpotifyNowPlayingDto>(
            userId, "https://api.spotify.com/v1/me/player/currently-playing");
    }

    private async Task<T?> GetAsync<T>(Guid userId, string url) where T : class
    {
        var accessToken = await tokenService.GetValidAccessTokenAsync(userId);

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await http.SendAsync(request);
        if (response.StatusCode == HttpStatusCode.NoContent)
        {
            return null;
        }
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<T>();
    }
}

public record SpotifyPage<T>([property: JsonPropertyName("items")] List<T> Items);

public record SpotifyArtistDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("genres")] List<string>? Genres);

public record SpotifyTrackDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("artists")] List<SpotifyArtistBriefDto> Artists);

public record SpotifyArtistBriefDto([property: JsonPropertyName("name")] string Name);

public record SpotifyNowPlayingDto(
    [property: JsonPropertyName("is_playing")] bool IsPlaying,
    [property: JsonPropertyName("item")] SpotifyTrackDto? Item);
