using System.Security.Claims;

namespace SameSpot.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    // El "sub" del JWT llega mapeado como NameIdentifier; siempre es un Guid
    // porque lo emitimos nosotros en JwtService.
    public static Guid GetUserId(this ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
