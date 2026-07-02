using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SameSpot.Api.Extensions;
using SameSpot.Api.Models;
using SameSpot.Api.Repositories;
using SameSpot.Api.Services;

namespace SameSpot.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/reviews")]
public class ReviewsController(
    IReviewRepository reviews,
    SpotifyApiService spotify) : ControllerBase
{
    // La nota llega como 0.5–5 en pasos de media estrella (estilo Letterboxd)
    public record CreateReviewRequest(string? ItemType, string? SpotifyItemId, double Rating, string? Text);
    public record UpdateReviewRequest(double Rating, string? Text);

    [HttpPost]
    public async Task<IActionResult> Create(CreateReviewRequest request)
    {
        var itemType = ParseItemType(request.ItemType);
        if (itemType is null)
        {
            return BadRequest(new { message = "itemType debe ser \"album\" o \"track\"." });
        }
        if (string.IsNullOrWhiteSpace(request.SpotifyItemId))
        {
            return BadRequest(new { message = "Falta spotifyItemId." });
        }
        if (ToHalfStars(request.Rating) is not int halfStars)
        {
            return BadRequest(new { message = "La nota debe estar entre 0.5 y 5 en pasos de 0.5." });
        }

        var myId = User.GetUserId();
        var itemId = request.SpotifyItemId.Trim();

        if (await reviews.GetByUserAndItemAsync(myId, itemType.Value, itemId) is not null)
        {
            return Conflict(new { message = "Ya has reseñado esto: edita tu reseña existente." });
        }

        // Pedimos el elemento a Spotify: valida que existe y nos da los
        // metadatos canónicos (nombre, artista, carátula) para guardarlos
        string itemName, artistName;
        string? imageUrl;
        if (itemType == ReviewItemType.Album)
        {
            var album = await spotify.GetAlbumAsync(myId, itemId);
            if (album is null) return NotFound(new { message = "Ese álbum no existe en Spotify." });
            (itemName, artistName, imageUrl) =
                (album.Name, JoinArtists(album.Artists), album.Images?.FirstOrDefault()?.Url);
        }
        else
        {
            var track = await spotify.GetTrackAsync(myId, itemId);
            if (track is null) return NotFound(new { message = "Esa canción no existe en Spotify." });
            (itemName, artistName, imageUrl) =
                (track.Name, JoinArtists(track.Artists), track.Album?.Images?.FirstOrDefault()?.Url);
        }

        var review = new Review
        {
            Id = Guid.NewGuid(),
            UserId = myId,
            ItemType = itemType.Value,
            SpotifyItemId = itemId,
            ItemName = itemName,
            ArtistName = artistName,
            ImageUrl = imageUrl,
            RatingHalfStars = halfStars,
            Text = NormalizeText(request.Text),
            CreatedAt = DateTime.UtcNow,
        };
        await reviews.AddAsync(review);
        await reviews.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMine), null, ToResponse(review));
    }

    [HttpGet("mine")]
    public async Task<IActionResult> GetMine()
    {
        var mine = await reviews.GetByUserAsync(User.GetUserId());
        return Ok(mine.Select(ToResponse));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateReviewRequest request)
    {
        if (ToHalfStars(request.Rating) is not int halfStars)
        {
            return BadRequest(new { message = "La nota debe estar entre 0.5 y 5 en pasos de 0.5." });
        }

        var review = await reviews.GetByIdAsync(id);
        if (review is null || review.UserId != User.GetUserId()) return NotFound();

        review.RatingHalfStars = halfStars;
        review.Text = NormalizeText(request.Text);
        review.UpdatedAt = DateTime.UtcNow;
        await reviews.SaveChangesAsync();

        return Ok(ToResponse(review));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var review = await reviews.GetByIdAsync(id);
        if (review is null || review.UserId != User.GetUserId()) return NotFound();

        reviews.Remove(review);
        await reviews.SaveChangesAsync();
        return NoContent();
    }

    private static ReviewItemType? ParseItemType(string? raw) => raw?.ToLowerInvariant() switch
    {
        "album" => ReviewItemType.Album,
        "track" => ReviewItemType.Track,
        _ => null,
    };

    // 0.5–5 en pasos de 0.5 → 1..10 medias estrellas; null si la nota no es válida
    private static int? ToHalfStars(double rating)
    {
        var doubled = rating * 2;
        if (doubled < 1 || doubled > 10 || Math.Abs(doubled - Math.Round(doubled)) > 0.001)
        {
            return null;
        }
        return (int)Math.Round(doubled);
    }

    private static string? NormalizeText(string? text) =>
        string.IsNullOrWhiteSpace(text) ? null : text.Trim();

    private static string JoinArtists(List<SpotifyArtistBriefDto> artists) =>
        string.Join(", ", artists.Select(a => a.Name));

    internal static object ToResponse(Review r) => new
    {
        r.Id,
        ItemType = r.ItemType == ReviewItemType.Album ? "album" : "track",
        r.SpotifyItemId,
        r.ItemName,
        r.ArtistName,
        r.ImageUrl,
        Rating = r.RatingHalfStars / 2.0,
        r.Text,
        r.CreatedAt,
        r.UpdatedAt,
    };
}
