using Microsoft.EntityFrameworkCore;
using SameSpot.Api.Data;
using SameSpot.Api.Models;

namespace SameSpot.Api.Repositories;

public class ConversationReadRepository(AppDbContext db) : IConversationReadRepository
{
    public async Task<DateTime?> GetLastReadAsync(Guid userId, Guid otherUserId)
    {
        var read = await db.ConversationReads.FindAsync(userId, otherUserId);
        return read?.LastReadAt;
    }

    public async Task MarkReadAsync(Guid userId, Guid otherUserId)
    {
        var read = await db.ConversationReads.FindAsync(userId, otherUserId);
        if (read is null)
        {
            db.ConversationReads.Add(new ConversationRead
            {
                UserId = userId,
                OtherUserId = otherUserId,
                LastReadAt = DateTime.UtcNow,
            });
        }
        else
        {
            read.LastReadAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
    }
}
