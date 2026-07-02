using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Data;
using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public class MessageRepository(AppDbContext db) : IMessageRepository
{
    // Los últimos N mensajes entre dos usuarios, en orden cronológico
    public async Task<List<Message>> GetConversationAsync(Guid userA, Guid userB, int limit)
    {
        var lastMessages = await db.Messages
            .Where(m => (m.SenderId == userA && m.RecipientId == userB)
                     || (m.SenderId == userB && m.RecipientId == userA))
            .OrderByDescending(m => m.SentAt)
            .Take(limit)
            .ToListAsync();

        lastMessages.Reverse();
        return lastMessages;
    }

    public Task<List<Message>> GetAllInvolvingAsync(Guid userId) =>
        db.Messages
            .Where(m => m.SenderId == userId || m.RecipientId == userId)
            .OrderByDescending(m => m.SentAt)
            .ToListAsync();

    public Task AddAsync(Message message) => db.Messages.AddAsync(message).AsTask();

    public Task SaveChangesAsync() => db.SaveChangesAsync();
}
