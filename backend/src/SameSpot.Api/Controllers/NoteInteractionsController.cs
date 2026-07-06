using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SameSpot.Api.Extensions;
using SameSpot.Api.Models;
using SameSpot.Api.Repositories;

namespace SameSpot.Api.Controllers;

// Likes ("me llega") y comentarios de las notas. Política del manifiesto:
// nada de contadores públicos — el número y los nombres de los "me llega"
// solo los ve el autor de la nota (o del comentario), y de la conversación
// solo se señala si existe, no cuánta hay.
[ApiController]
[Authorize]
[Route("api/notes")]
public class NoteInteractionsController(
    INoteRepository notes,
    INoteLikeRepository likes,
    INoteCommentRepository comments) : ControllerBase
{
    public record CreateCommentRequest(string? Text, Guid? ParentCommentId);

    [HttpPost("{id:guid}/like")]
    public async Task<IActionResult> Like(Guid id)
    {
        var myId = User.GetUserId();
        var note = await notes.GetByIdAsync(id);
        if (note is null) return NotFound();
        if (note.UserId == myId)
        {
            return BadRequest(new { message = "No puedes marcar tu propia nota." });
        }

        if (await likes.GetAsync(id, myId) is null)
        {
            await likes.AddAsync(new NoteLike { NoteId = id, UserId = myId, CreatedAt = DateTime.UtcNow });
            await likes.SaveChangesAsync();
        }
        return NoContent();
    }

    [HttpDelete("{id:guid}/like")]
    public async Task<IActionResult> Unlike(Guid id)
    {
        var like = await likes.GetAsync(id, User.GetUserId());
        if (like is not null)
        {
            likes.Remove(like);
            await likes.SaveChangesAsync();
        }
        return NoContent();
    }

    // Estado de lector para un lote de notas visibles (una sola llamada por
    // pantalla): si las marqué yo, si tienen conversación y, solo en las
    // MÍAS, a quién le llegan.
    [HttpGet("interactions")]
    public async Task<IActionResult> GetInteractions([FromQuery] string? ids)
    {
        var noteIds = (ids ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(raw => Guid.TryParse(raw, out var id) ? id : Guid.Empty)
            .Where(id => id != Guid.Empty)
            .Distinct()
            .Take(100)
            .ToList();
        if (noteIds.Count == 0) return Ok(Array.Empty<object>());

        var myId = User.GetUserId();
        var likedByMe = (await likes.GetLikedNoteIdsAsync(myId, noteIds)).ToHashSet();
        var withComments = (await comments.GetNoteIdsWithCommentsAsync(noteIds)).ToHashSet();
        var myNotesLikes = (await likes.GetForAuthorNotesAsync(myId, noteIds))
            .ToLookup(l => l.NoteId);

        return Ok(noteIds.Select(id => new
        {
            NoteId = id,
            LikedByMe = likedByMe.Contains(id),
            HasComments = withComments.Contains(id),
            LikedBy = myNotesLikes.Contains(id)
                ? myNotesLikes[id].Select(l => l.User.DisplayName).ToList()
                : null,
        }));
    }

    [HttpGet("{id:guid}/comments")]
    public async Task<IActionResult> GetComments(Guid id)
    {
        var note = await notes.GetByIdAsync(id);
        if (note is null) return NotFound();

        var thread = await comments.GetThreadAsync(id);
        return Ok(await ToThreadResponseAsync(thread));
    }

    [HttpPost("{id:guid}/comments")]
    public async Task<IActionResult> CreateComment(Guid id, CreateCommentRequest request)
    {
        var text = request.Text?.Trim();
        if (string.IsNullOrEmpty(text))
        {
            return BadRequest(new { message = "El comentario no puede estar vacío." });
        }
        if (text.Length > 1000)
        {
            return BadRequest(new { message = "El comentario no puede superar los 1000 caracteres." });
        }

        var note = await notes.GetByIdAsync(id);
        if (note is null) return NotFound();

        // Un solo nivel de hilo: responder a una respuesta cuelga de su raíz
        Guid? parentId = null;
        if (request.ParentCommentId is Guid rawParentId)
        {
            var parent = await comments.GetByIdAsync(rawParentId);
            if (parent is null || parent.NoteId != id)
            {
                return NotFound(new { message = "Ese comentario no existe en esta nota." });
            }
            parentId = parent.ParentCommentId ?? parent.Id;
        }

        var comment = new NoteComment
        {
            Id = Guid.NewGuid(),
            NoteId = id,
            UserId = User.GetUserId(),
            ParentCommentId = parentId,
            Text = text,
            CreatedAt = DateTime.UtcNow,
        };
        await comments.AddAsync(comment);
        await comments.SaveChangesAsync();

        // Recargamos el hilo entero: el cliente lo repinta y así el nuevo
        // comentario llega ya colocado en su sitio
        var thread = await comments.GetThreadAsync(id);
        return CreatedAtAction(nameof(GetComments), new { id }, await ToThreadResponseAsync(thread));
    }

    [HttpDelete("comments/{commentId:guid}")]
    public async Task<IActionResult> DeleteComment(Guid commentId)
    {
        var comment = await comments.GetByIdAsync(commentId);
        if (comment is null || comment.UserId != User.GetUserId()) return NotFound();

        comments.Remove(comment);
        await comments.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("comments/{commentId:guid}/like")]
    public async Task<IActionResult> LikeComment(Guid commentId)
    {
        var myId = User.GetUserId();
        var comment = await comments.GetByIdAsync(commentId);
        if (comment is null) return NotFound();
        if (comment.UserId == myId)
        {
            return BadRequest(new { message = "No puedes marcar tu propio comentario." });
        }

        if (await comments.GetLikeAsync(commentId, myId) is null)
        {
            await comments.AddLikeAsync(new CommentLike { CommentId = commentId, UserId = myId, CreatedAt = DateTime.UtcNow });
            await comments.SaveChangesAsync();
        }
        return NoContent();
    }

    [HttpDelete("comments/{commentId:guid}/like")]
    public async Task<IActionResult> UnlikeComment(Guid commentId)
    {
        var like = await comments.GetLikeAsync(commentId, User.GetUserId());
        if (like is not null)
        {
            comments.RemoveLike(like);
            await comments.SaveChangesAsync();
        }
        return NoContent();
    }

    // Agrupa el hilo plano en raíces con sus respuestas. El recuento de
    // "me llega" solo viaja en los comentarios del que consulta.
    private async Task<List<object>> ToThreadResponseAsync(List<NoteComment> thread)
    {
        var myId = User.GetUserId();
        var commentIds = thread.Select(c => c.Id).ToList();
        var likedByMe = (await comments.GetLikedCommentIdsAsync(myId, commentIds)).ToHashSet();
        var myCommentIds = thread.Where(c => c.UserId == myId).Select(c => c.Id).ToList();
        var likeCounts = myCommentIds.Count > 0
            ? await comments.GetLikeCountsAsync(myCommentIds)
            : new Dictionary<Guid, int>();

        var replies = thread.Where(c => c.ParentCommentId is not null)
            .ToLookup(c => c.ParentCommentId!.Value);

        object ToComment(NoteComment c) => new
        {
            c.Id,
            Author = new { c.User.Id, c.User.DisplayName, c.User.AvatarUrl },
            c.Text,
            c.CreatedAt,
            LikedByMe = likedByMe.Contains(c.Id),
            LikeCount = c.UserId == myId ? likeCounts.GetValueOrDefault(c.Id) : (int?)null,
        };

        return thread.Where(c => c.ParentCommentId is null)
            .Select(root => (object)new
            {
                Root = ToComment(root),
                Replies = replies[root.Id].Select(ToComment).ToList(),
            })
            .ToList();
    }
}
