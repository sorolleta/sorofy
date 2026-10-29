using System.Net.Http.Headers;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using SameSpot.Api.Options;

namespace SameSpot.Api.Services;

// Habla con accounts.spotify.com (OAuth) y con el perfil del usuario.
public class SpotifyAuthService(HttpClient http, IOptions<SpotifyOptions> options)
{
    // playlist-modify-private: para la playlist "Mis Descubrimientos" y
    // guardar estanterías; playlist-read-*: para importar tus playlists
    private const string Scopes = "user-read-private user-top-read user-read-currently-playing " +
                                  "playlist-modify-private playlist-read-private playlist-read-collaborative " +
                                  "user-read-recently-played";
    private readonly SpotifyOptions _options = options.Value;

    public string BuildAuthorizeUrl(string state)
    {
        var query = new Dictionary<string, string?>
        {
            ["response_type"] = "code",
            ["client_id"] = _options.ClientId,
            ["scope"] = Scopes,
            ["redirect_uri"] = _options.RedirectUri,
            ["state"] = state,
        };
        return "https://accounts.spotify.com/authorize?" +
               string.Join("&", query.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value!)}"));
    }

    public async Task<SpotifyTokenResponse> ExchangeCodeAsync(string code)
    {
        var form = new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = _options.RedirectUri,
        };
        return await PostTokenRequestAsync(form);
    }

    public async Task<SpotifyTokenResponse> RefreshTokenAsync(string refreshToken)
    {
        var form = new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = refreshToken,
        };
        return await PostTokenRequestAsync(form);
    }

    // Token de la propia app (client credentials): sirve para buscar y leer el
    // catálogo en nombre de los invitados, que no tienen cuenta de Spotify.
    // Se cachea entre peticiones hasta un minuto antes de que caduque.
    private static string? _appToken;
    private static DateTime _appTokenExpiresAt;

    public async Task<string> GetAppTokenAsync()
    {
        if (_appToken is not null && _appTokenExpiresAt > DateTime.UtcNow) return _appToken;
        var response = await PostTokenRequestAsync(new() { ["grant_type"] = "client_credentials" });
        _appTokenExpiresAt = DateTime.UtcNow.AddSeconds(response.ExpiresIn - 60);
        return _appToken = response.AccessToken;
    }

    public async Task<SpotifyUserProfile> GetProfileAsync(string accessToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://api.spotify.com/v1/me");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await http.SendAsync(request);
        response.EnsureSuccessStatusCode();

        return (await response.Content.ReadFromJsonAsync<SpotifyUserProfile>())!;
    }

    private async Task<SpotifyTokenResponse> PostTokenRequestAsync(Dictionary<string, string> form)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://accounts.spotify.com/api/token")
        {
            Content = new FormUrlEncodedContent(form),
        };

        // Spotify autentica la app con Basic auth: base64(clientId:clientSecret)
        var credentials = Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{_options.ClientId}:{_options.ClientSecret}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);

        var response = await http.SendAsync(request);
        response.EnsureSuccessStatusCode();

        return (await response.Content.ReadFromJsonAsync<SpotifyTokenResponse>())!;
    }
}

public record SpotifyTokenResponse(
    [property: JsonPropertyName("access_token")] string AccessToken,
    [property: JsonPropertyName("refresh_token")] string? RefreshToken,
    [property: JsonPropertyName("expires_in")] int ExpiresIn);

public record SpotifyUserProfile(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("display_name")] string? DisplayName,
    [property: JsonPropertyName("images")] List<SpotifyImage>? Images);

public record SpotifyImage([property: JsonPropertyName("url")] string Url);
