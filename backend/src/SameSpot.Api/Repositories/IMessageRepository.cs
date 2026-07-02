using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public interface IMessageRepository
{
    Task<List<Message>> GetConversationAsync(Guid userA, Guid userB, int limit);
    Task<List<Message>> GetAllInvolvingAsync(Guid userId);
    Task AddAsync(Message message);
    Task SaveChangesAsync();
}
