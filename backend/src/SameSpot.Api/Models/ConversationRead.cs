namespace SameSpot.Api.Models;

// Cuándo leyó cada usuario por última vez su conversación con otro. Una
// fila por dirección (yo→él y él→yo son filas distintas): así "no leído"
// solo depende de mi propia lectura, no de la suya.
public class ConversationRead
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid OtherUserId { get; set; }
    public User OtherUser { get; set; } = null!;

    public DateTime LastReadAt { get; set; }
}
