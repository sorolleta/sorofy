using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SameSpot.Api.Extensions;
using SameSpot.Api.Repositories;

namespace SameSpot.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/chats")]
public class ChatsController(
    IMessageRepository messages,
    IUserRepository users) : ControllerBase
{
    private const int HistoryLimit = 100;

    // Conversaciones abiertas: el último mensaje cruzado con cada usuario
    [HttpGet]
    public async Task<IActionResult> GetConversations()
    {
        var myId = User.GetUserId();
        var mine = await messages.GetAllInvolvingAsync(myId);

        // Vienen ordenados del más reciente al más antiguo, así que el
        // primero de cada interlocutor es el último mensaje con él
        var result = new List<object>();
        foreach (var group in mine.GroupBy(m => m.SenderId == myId ? m.RecipientId : m.SenderId))
        {
            var partner = await users.GetByIdAsync(group.Key);
            if (partner is null) continue;

            var last = group.First();
            result.Add(new
            {
                UserId = partner.Id,
                partner.DisplayName,
                partner.AvatarUrl,
                LastMessage = new { last.Text, last.SentAt, FromMe = last.SenderId == myId },
            });
        }
        return Ok(result);
    }

    // Historial con un usuario concreto (los últimos 100, en orden cronológico)
    [HttpGet("{userId:guid}")]
    public async Task<IActionResult> GetConversation(Guid userId)
    {
        var myId = User.GetUserId();
        if (userId == myId)
        {
            return BadRequest(new { message = "No puedes chatear contigo mismo." });
        }
        if (await users.GetByIdAsync(userId) is null) return NotFound();

        var conversation = await messages.GetConversationAsync(myId, userId, HistoryLimit);
        return Ok(conversation.Select(m => new
        {
            m.Id,
            m.SenderId,
            m.RecipientId,
            m.Text,
            m.SentAt,
        }));
    }
}
