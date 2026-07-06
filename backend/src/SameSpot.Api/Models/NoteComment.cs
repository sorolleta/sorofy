namespace SameSpot.Api.Models;

// Un comentario en una nota. Un solo nivel de respuestas: ParentCommentId
// apunta siempre a un comentario raíz (responder a una respuesta cuelga
// del mismo hilo).
public class NoteComment
{
    public Guid Id { get; set; }

    public Guid NoteId { get; set; }
    public Note Note { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid? ParentCommentId { get; set; }
    public NoteComment? ParentComment { get; set; }

    public required string Text { get; set; }

    public DateTime CreatedAt { get; set; }
}
