using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SameSpot.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRutas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GroupVideos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MusicItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: false),
                    ThumbnailUrl = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupVideos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GroupVideos_MusicItems_MusicItemId",
                        column: x => x.MusicItemId,
                        principalTable: "MusicItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RutaRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FromUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ArtistName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ArtistSpotifyId = table.Column<string>(type: "text", nullable: true),
                    AnsweredByRutaId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RutaRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RutaRequests_Users_FromUserId",
                        column: x => x.FromUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Rutas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Intro = table.Column<string>(type: "character varying(600)", maxLength: 600, nullable: true),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: false),
                    ArtistName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ArtistSpotifyId = table.Column<string>(type: "text", nullable: true),
                    BranchesJson = table.Column<string>(type: "jsonb", nullable: false),
                    ForkedFromId = table.Column<Guid>(type: "uuid", nullable: true),
                    AnswersRequestId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Rutas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Rutas_Users_AuthorId",
                        column: x => x.AuthorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RutaProgress",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RutaId = table.Column<Guid>(type: "uuid", nullable: false),
                    NodeId = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RutaProgress", x => new { x.UserId, x.RutaId, x.NodeId });
                    table.ForeignKey(
                        name: "FK_RutaProgress_Rutas_RutaId",
                        column: x => x.RutaId,
                        principalTable: "Rutas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RutaProgress_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RutaSaves",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RutaId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RutaSaves", x => new { x.UserId, x.RutaId });
                    table.ForeignKey(
                        name: "FK_RutaSaves_Rutas_RutaId",
                        column: x => x.RutaId,
                        principalTable: "Rutas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RutaSaves_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GroupVideos_MusicItemId",
                table: "GroupVideos",
                column: "MusicItemId");

            migrationBuilder.CreateIndex(
                name: "IX_RutaProgress_RutaId",
                table: "RutaProgress",
                column: "RutaId");

            migrationBuilder.CreateIndex(
                name: "IX_RutaRequests_FromUserId",
                table: "RutaRequests",
                column: "FromUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Rutas_ArtistName",
                table: "Rutas",
                column: "ArtistName");

            migrationBuilder.CreateIndex(
                name: "IX_Rutas_AuthorId",
                table: "Rutas",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_RutaSaves_RutaId",
                table: "RutaSaves",
                column: "RutaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GroupVideos");

            migrationBuilder.DropTable(
                name: "RutaProgress");

            migrationBuilder.DropTable(
                name: "RutaRequests");

            migrationBuilder.DropTable(
                name: "RutaSaves");

            migrationBuilder.DropTable(
                name: "Rutas");
        }
    }
}
