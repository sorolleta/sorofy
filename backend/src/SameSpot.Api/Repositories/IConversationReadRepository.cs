namespace SameSpot.Api.Repositories;

public interface IConversationReadRepository
{
    Task<DateTime?> GetLastReadAsync(Guid userId, Guid otherUserId);

    // Marca la conversación como leída ahora mismo (crea la fila la primera vez)
    Task MarkReadAsync(Guid userId, Guid otherUserId);
}
