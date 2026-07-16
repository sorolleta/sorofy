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

    // Con álbum incluido: de ahí salen la carátula y los "álbumes más queridos"
    public async Task<List<SpotifyFullTrackDto>> GetTopTracksAsync(Guid userId)
    {
        var response = await GetAsync<SpotifyPage<SpotifyFullTrackDto>>(
            userId, $"https://api.spotify.com/v1/me/top/tracks?limit={TopLimit}&time_range=medium_term");
        return response?.Items ?? [];
    }

    // Devuelve null si el usuario no está escuchando nada (Spotify responde 204)
    public async Task<SpotifyNowPlayingDto?> GetNowPlayingAsync(Guid userId)
    {
        return await GetAsync<SpotifyNowPlayingDto>(
            userId, "https://api.spotify.com/v1/me/player/currently-playing");
    }

    // Búsqueda de álbumes, canciones y artistas para escribir notas sobre ellos
    public async Task<SpotifySearchDto?> SearchAsync(Guid userId, string query)
    {
        return await GetAsync<SpotifySearchDto>(
            userId, $"https://api.spotify.com/v1/search?q={Uri.EscapeDataString(query)}&type=album,track,artist&limit=10");
    }

    // Elementos individuales: se usan al crear una nota para validar el id y
    // guardar los metadatos canónicos (no nos fiamos de los del cliente)
    public async Task<SpotifyAlbumDto?> GetAlbumAsync(Guid userId, string albumId)
    {
        return await GetItemOrNullAsync<SpotifyAlbumDto>(
            userId, $"https://api.spotify.com/v1/albums/{Uri.EscapeDataString(albumId)}");
    }

    public async Task<SpotifyFullTrackDto?> GetTrackAsync(Guid userId, string trackId)
    {
        return await GetItemOrNullAsync<SpotifyFullTrackDto>(
            userId, $"https://api.spotify.com/v1/tracks/{Uri.EscapeDataString(trackId)}");
    }

    public async Task<SpotifyFullArtistDto?> GetArtistAsync(Guid userId, string artistId)
    {
        return await GetItemOrNullAsync<SpotifyFullArtistDto>(
            userId, $"https://api.spotify.com/v1/artists/{Uri.EscapeDataString(artistId)}");
    }

    // Los discos de un artista, para el panel "Más de X" de su ficha
    public async Task<List<SpotifyAlbumDto>> GetArtistAlbumsAsync(Guid userId, string artistId, int limit)
    {
        var response = await GetItemOrNullAsync<SpotifyPage<SpotifyAlbumDto>>(
            userId,
            $"https://api.spotify.com/v1/artists/{Uri.EscapeDataString(artistId)}/albums?include_groups=album&limit={limit}");
        return response?.Items ?? [];
    }

    // La playlist privada "Mis Descubrimientos": se crea una vez por usuario
    public async Task<string> CreatePlaylistAsync(Guid userId, string name, string description)
    {
        var playlist = await PostAsync<SpotifyPlaylistDto>(
            userId, "https://api.spotify.com/v1/me/playlists",
            new { name, description, @public = false });
        return playlist!.Id;
    }

    public Task AddPlaylistTrackAsync(Guid userId, string playlistId, string trackId)
    {
        return PostAsync<object>(
            userId, $"https://api.spotify.com/v1/playlists/{Uri.EscapeDataString(playlistId)}/items",
            new { uris = new[] { $"spotify:track:{trackId}" } });
    }

    // Spotify responde 404 si el id no existe y 400 si ni siquiera tiene
    // formato de id: para nosotros ambos significan "no existe"
    private async Task<T?> GetItemOrNullAsync<T>(Guid userId, string url) where T : class
    {
        try
        {
            return await GetAsync<T>(userId, url);
        }
        catch (HttpRequestException e) when (
            e.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.BadRequest)
        {
            return null;
        }
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

    private async Task<T?> PostAsync<T>(Guid userId, string url, object body) where T : class
    {
        var accessToken = await tokenService.GetValidAccessTokenAsync(userId);

        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        request.Content = JsonContent.Create(body);

        var response = await http.SendAsync(request);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<T>();
    }
}

public record SpotifyPage<T>([property: JsonPropertyName("items")] List<T> Items);

public record SpotifyArtistDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("genres")] List<string>? Genres,
    [property: JsonPropertyName("images")] List<SpotifyImageDto>? Images);

public record SpotifyTrackDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("artists")] List<SpotifyArtistBriefDto> Artists);

public record SpotifyArtistBriefDto([property: JsonPropertyName("name")] string Name);

public record SpotifyNowPlayingDto(
    [property: JsonPropertyName("is_playing")] bool IsPlaying,
    [property: JsonPropertyName("item")] SpotifyTrackDto? Item);

public record SpotifySearchDto(
    [property: JsonPropertyName("albums")] SpotifyPage<SpotifyAlbumDto>? Albums,
    [property: JsonPropertyName("tracks")] SpotifyPage<SpotifyFullTrackDto>? Tracks,
    [property: JsonPropertyName("artists")] SpotifyPage<SpotifyFullArtistDto>? Artists);

// Como SpotifyArtistDto pero con las imágenes, de donde sacamos la foto
public record SpotifyFullArtistDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("images")] List<SpotifyImageDto>? Images);

public record SpotifyAlbumDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("artists")] List<SpotifyArtistBriefDto> Artists,
    [property: JsonPropertyName("images")] List<SpotifyImageDto>? Images,
    // Solo llegan al pedir el álbum individual (la ficha los usa)
    [property: JsonPropertyName("release_date")] string? ReleaseDate,
    [property: JsonPropertyName("total_tracks")] int? TotalTracks,
    [property: JsonPropertyName("tracks")] SpotifyPage<SpotifyAlbumTrackDto>? Tracks);

// Una pista dentro de un álbum (la respuesta del álbum no repite el álbum)
public record SpotifyAlbumTrackDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("track_number")] int TrackNumber,
    [property: JsonPropertyName("duration_ms")] int DurationMs);

// Como SpotifyTrackDto pero con el álbum, del que sacamos la carátula
public record SpotifyFullTrackDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("artists")] List<SpotifyArtistBriefDto> Artists,
    [property: JsonPropertyName("album")] SpotifyAlbumDto? Album,
    [property: JsonPropertyName("duration_ms")] int? DurationMs);

public record SpotifyImageDto([property: JsonPropertyName("url")] string Url);

public record SpotifyPlaylistDto([property: JsonPropertyName("id")] string Id);
