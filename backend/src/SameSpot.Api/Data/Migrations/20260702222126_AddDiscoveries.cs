using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SameSpot.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDiscoveries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DiscoveriesPlaylistId",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Discoveries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: false),
                    MusicItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    NoteId = table.Column<Guid>(type: "uuid", nullable: true),
                    SavedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Discoveries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Discoveries_MusicItems_MusicItemId",
                        column: x => x.MusicItemId,
                        principalTable: "MusicItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Discoveries_Notes_NoteId",
                        column: x => x.NoteId,
                        principalTable: "Notes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Discoveries_Users_AuthorId",
                        column: x => x.AuthorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Discoveries_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Discoveries_AuthorId",
                table: "Discoveries",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_Discoveries_MusicItemId",
                table: "Discoveries",
                column: "MusicItemId");

            migrationBuilder.CreateIndex(
                name: "IX_Discoveries_NoteId",
                table: "Discoveries",
                column: "NoteId");

            migrationBuilder.CreateIndex(
                name: "IX_Discoveries_UserId_MusicItemId",
                table: "Discoveries",
                columns: new[] { "UserId", "MusicItemId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Discoveries");

            migrationBuilder.DropColumn(
                name: "DiscoveriesPlaylistId",
                table: "Users");
        }
    }
}
