using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SameSpot.Api.Models;
using SameSpot.Api.Repositories;
using SameSpot.Api.Services;

namespace SameSpot.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    SpotifyAuthService spotifyAuth,
    JwtService jwt,
    IUserRepository users,
    IConfiguration config) : ControllerBase
{
    private const string StateCookie = "spotify_auth_state";
    // Los invitados entran sin Spotify: Spotify solo deja usar la app a 5
    // usuarios en modo desarrollo, y así cualquiera puede ver la demo
    public const string GuestPrefix = "guest-";

    // Crea una cuenta de invitado nueva y devuelve su JWT. Cada visitante
    // tiene la suya, así sus notas y seguidos no se mezclan con los de otros.
    [HttpPost("guest")]
    [EnableRateLimiting("guest")]
    public async Task<IActionResult> Guest()
    {
        var suffix = Convert.ToHexString(RandomNumberGenerator.GetBytes(4)).ToLowerInvariant();
        var number = RandomNumberGenerator.GetInt32(1000, 10000);
        var user = new User
        {
            Id = Guid.NewGuid(),
            SpotifyId = GuestPrefix + suffix,
            DisplayName = $"Invitado {number}",
            AvatarUrl = $"https://api.dicebear.com/9.x/notionists/svg?seed={suffix}&backgroundColor=efd35d",
        };
        await users.AddAsync(user);
        await users.SaveChangesAsync();

        return Ok(new { token = jwt.CreateToken(user) });
    }

    // Punto de entrada del login: redirige a la pantalla de permisos de Spotify
    [HttpGet("spotify/login")]
    public IActionResult Login()
    {
        // El state evita CSRF: lo guardamos en cookie y Spotify nos lo devuelve
        var state = Convert.ToHexString(RandomNumberGenerator.GetBytes(16));
        Response.Cookies.Append(StateCookie, state, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            MaxAge = TimeSpan.FromMinutes(10),
        });

        return Redirect(spotifyAuth.BuildAuthorizeUrl(state));
    }

    // Spotify redirige aquí tras el consentimiento del usuario
    [HttpGet("spotify/callback")]
    public async Task<IActionResult> Callback(string? code, string? state, string? error)
    {
        if (error is not null)
        {
            return BadRequest(new { message = $"Spotify devolvió un error: {error}" });
        }
        if (code is null || state is null || state != Request.Cookies[StateCookie])
        {
            return BadRequest(new { message = "State inválido o código ausente." });
        }
        Response.Cookies.Delete(StateCookie);

        var tokens = await spotifyAuth.ExchangeCodeAsync(code);
        var profile = await spotifyAuth.GetProfileAsync(tokens.AccessToken);

        var user = await users.GetBySpotifyIdAsync(profile.Id);
        if (user is null)
        {
            user = new User
            {
                SpotifyId = profile.Id,
                DisplayName = profile.DisplayName ?? profile.Id,
                AvatarUrl = profile.Images?.FirstOrDefault()?.Url,
            };
            await users.AddAsync(user);
        }
        else
        {
            // Refrescar los datos visibles por si cambiaron en Spotify
            user.DisplayName = profile.DisplayName ?? profile.Id;
            user.AvatarUrl = profile.Images?.FirstOrDefault()?.Url;
        }

        var expiresAt = DateTime.UtcNow.AddSeconds(tokens.ExpiresIn);
        if (user.SpotifyToken is null)
        {
            user.SpotifyToken = new SpotifyToken
            {
                AccessToken = tokens.AccessToken,
                RefreshToken = tokens.RefreshToken!,
                ExpiresAt = expiresAt,
            };
        }
        else
        {
            user.SpotifyToken.AccessToken = tokens.AccessToken;
            user.SpotifyToken.RefreshToken = tokens.RefreshToken ?? user.SpotifyToken.RefreshToken;
            user.SpotifyToken.ExpiresAt = expiresAt;
        }
        await users.SaveChangesAsync();

        var token = jwt.CreateToken(user);

        // Con frontend configurado, se le redirige con el token en el fragment
        // (#token=...): el fragment nunca viaja al servidor ni acaba en logs.
        var frontendUrl = config["FRONTEND_URL"];
        if (!string.IsNullOrEmpty(frontendUrl))
        {
            return Redirect($"{frontendUrl}/auth/callback#token={token}");
        }

        return Ok(new
        {
            token,
            user = new { user.Id, user.SpotifyId, user.DisplayName, user.AvatarUrl },
        });
    }

    // Endpoint protegido para comprobar que un JWT emitido es válido
    [Authorize]
    [HttpGet("session")]
    public IActionResult Session() => Ok(new
    {
        userId = User.FindFirstValue(ClaimTypes.NameIdentifier),
        name = User.FindFirstValue("name"),
    });
}
