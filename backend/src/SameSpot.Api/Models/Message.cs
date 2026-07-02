namespace SameSpot.Api.Models;

// Mensaje directo entre dos usuarios
public class Message
{
    public long Id { get; set; }

    public Guid SenderId { get; set; }
    public User Sender { get; set; } = null!;

    public Guid RecipientId { get; set; }
    public User Recipient { get; set; } = null!;

    public required string Text { get; set; }
    public DateTime SentAt { get; set; }
}
