namespace SameSpot.Api.Models;

// El "me llega" de un comentario, con la misma política íntima que el de
// las notas: el recuento solo lo ve quien escribió el comentario.
public class CommentLike
{
    public Guid CommentId { get; set; }
    public NoteComment Comment { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime CreatedAt { get; set; }
}
