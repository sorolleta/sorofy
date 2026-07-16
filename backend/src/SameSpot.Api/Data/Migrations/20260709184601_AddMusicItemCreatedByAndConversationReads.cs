using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SameSpot.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMusicItemCreatedByAndConversationReads : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "MusicItems",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ConversationReads",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    OtherUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    LastReadAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConversationReads", x => new { x.UserId, x.OtherUserId });
                    table.ForeignKey(
                        name: "FK_ConversationReads_Users_OtherUserId",
                        column: x => x.OtherUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ConversationReads_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MusicItems_CreatedByUserId",
                table: "MusicItems",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ConversationReads_OtherUserId",
                table: "ConversationReads",
                column: "OtherUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_MusicItems_Users_CreatedByUserId",
                table: "MusicItems",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MusicItems_Users_CreatedByUserId",
                table: "MusicItems");

            migrationBuilder.DropTable(
                name: "ConversationReads");

            migrationBuilder.DropIndex(
                name: "IX_MusicItems_CreatedByUserId",
                table: "MusicItems");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "MusicItems");
        }
    }
}
