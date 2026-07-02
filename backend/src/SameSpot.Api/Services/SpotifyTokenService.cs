using SameSpot.Api.Repositories;

namespace SameSpot.Api.Services;

// Devuelve siempre un access token válido: si el guardado está a punto de
// caducar, lo renueva contra Spotify y persiste el nuevo antes de devolverlo.
public class SpotifyTokenService(ISpotifyTokenRepository tokens, SpotifyAuthService spotifyAuth)
{
    // Margen para no usar un token que caduque en mitad de una petición
    private static readonly TimeSpan ExpiryMargin = TimeSpan.FromMinutes(1);

    public async Task<string> GetValidAccessTokenAsync(Guid userId)
    {
        var token = await tokens.GetByUserIdAsync(userId)
            ?? throw new InvalidOperationException($"El usuario {userId} no tiene token de Spotify.");

        if (token.ExpiresAt - ExpiryMargin > DateTime.UtcNow)
        {
            return token.AccessToken;
        }

        var refreshed = await spotifyAuth.RefreshTokenAsync(token.RefreshToken);

        token.AccessToken = refreshed.AccessToken;
        token.ExpiresAt = DateTime.UtcNow.AddSeconds(refreshed.ExpiresIn);
        // Spotify rota el refresh token en cada renovación (caducan a los 180 días);
        // si no manda uno nuevo, el actual sigue siendo válido
        if (refreshed.RefreshToken is not null)
        {
            token.RefreshToken = refreshed.RefreshToken;
        }
        await tokens.SaveChangesAsync();

        return token.AccessToken;
    }
}
