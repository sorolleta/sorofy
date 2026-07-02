using System.Net;

namespace SameSpot.Api.Services;

// Si Spotify devuelve 429 (rate limit), espera lo que pida la cabecera
// Retry-After y reintenta una única vez. Esperas largas no se bloquean:
// mejor devolver el error que colgar la petición del usuario.
public class SpotifyRateLimitHandler : DelegatingHandler
{
    private static readonly TimeSpan MaxWait = TimeSpan.FromSeconds(10);

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var response = await base.SendAsync(request, cancellationToken);
        if (response.StatusCode != HttpStatusCode.TooManyRequests)
        {
            return response;
        }

        var wait = response.Headers.RetryAfter?.Delta ?? TimeSpan.FromSeconds(1);
        if (wait > MaxWait)
        {
            return response;
        }

        response.Dispose();
        await Task.Delay(wait, cancellationToken);
        return await base.SendAsync(request, cancellationToken);
    }
}
