using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SameSpot.Api.Extensions;
using SameSpot.Api.Models;
using SameSpot.Api.Repositories;

namespace SameSpot.Api.Hubs;

// Chat en tiempo real. SignalR enruta por usuario usando el claim
// NameIdentifier del JWT (el "sub"), así que Clients.User(id) llega a
// todas las pestañas donde ese usuario tenga el chat abierto.
[Authorize]
public class ChatHub(IMessageRepository messages, IUserRepository users) : Hub
{
    public async Task SendMessage(Guid recipientId, string text)
    {
        var senderId = Context.User!.GetUserId();

        if (recipientId == senderId)
        {
            throw new HubException("No puedes chatear contigo mismo.");
        }
        var trimmed = text?.Trim() ?? "";
        if (trimmed.Length is 0 or > 1000)
        {
            throw new HubException("El mensaje debe tener entre 1 y 1000 caracteres.");
        }
        if (await users.GetByIdAsync(recipientId) is null)
        {
            throw new HubException("Ese usuario no existe.");
        }

        var message = new Message
        {
            SenderId = senderId,
            RecipientId = recipientId,
            Text = trimmed,
            SentAt = DateTime.UtcNow,
        };
        await messages.AddAsync(message);
        await messages.SaveChangesAsync();

        var dto = new
        {
            message.Id,
            message.SenderId,
            message.RecipientId,
            message.Text,
            message.SentAt,
        };

        // Al destinatario y también al emisor (para sus otras pestañas)
        await Clients.User(recipientId.ToString()).SendAsync("messageReceived", dto);
        await Clients.User(senderId.ToString()).SendAsync("messageReceived", dto);
    }
}
