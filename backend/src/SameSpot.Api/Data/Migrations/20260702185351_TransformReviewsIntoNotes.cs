using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SameSpot.Api.Data.Migrations
{
    /// <summary>
    /// Giro "Slow Music App": las reseñas con estrellas se transforman en
    /// notas de contexto. Los items reseñados pasan a la nueva tabla
    /// MusicItems (que también admite grupos locales sin id de Spotify) y
    /// cada reseña se convierte en nota conservando texto y fechas. Lo único
    /// que se pierde es la puntuación, a propósito: esto ya no es un tablón
    /// de reseñas.
    /// </summary>
    public partial class TransformReviewsIntoNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MusicItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    SpotifyId = table.Column<string>(type: "text", nullable: true),
                    Name = table.Column<string>(type: "text", nullable: false),
                    ArtistName = table.Column<string>(type: "text", nullable: true),
                    ImageUrl = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MusicItems", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MusicItems_Type_SpotifyId",
                table: "MusicItems",
                columns: new[] { "Type", "SpotifyId" },
                unique: true,
                filter: "\"SpotifyId\" IS NOT NULL");

            // Cada item reseñado pasa a MusicItems una sola vez, aunque lo
            // hayan reseñado varios usuarios. Los valores de ItemType
            // (Album=0, Track=1) coinciden con los del nuevo enum.
            migrationBuilder.Sql("""
                INSERT INTO "MusicItems" ("Id", "Type", "SpotifyId", "Name", "ArtistName", "ImageUrl", "CreatedAt")
                SELECT DISTINCT ON ("ItemType", "SpotifyItemId")
                       gen_random_uuid(), "ItemType", "SpotifyItemId", "ItemName", "ArtistName", "ImageUrl", now()
                FROM "Reviews"
                ORDER BY "ItemType", "SpotifyItemId", "CreatedAt";
                """);

            // Las reseñas se convierten en notas conservando id, texto y fechas
            migrationBuilder.RenameTable(name: "Reviews", newName: "Notes");
            migrationBuilder.Sql("""ALTER TABLE "Notes" RENAME CONSTRAINT "PK_Reviews" TO "PK_Notes";""");
            migrationBuilder.Sql("""ALTER TABLE "Notes" RENAME CONSTRAINT "FK_Reviews_Users_UserId" TO "FK_Notes_Users_UserId";""");

            migrationBuilder.AddColumn<Guid>(
                name: "MusicItemId",
                table: "Notes",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "Notes" n
                SET "MusicItemId" = m."Id"
                FROM "MusicItems" m
                WHERE m."Type" = n."ItemType" AND m."SpotifyId" = n."SpotifyItemId";
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "MusicItemId",
                table: "Notes",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VibeColor",
                table: "Notes",
                type: "character varying(9)",
                maxLength: 9,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VibeEmoji",
                table: "Notes",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VibeLabel",
                table: "Notes",
                type: "character varying(40)",
                maxLength: 40,
                nullable: true);

            // Fuera el índice único usuario+item (ahora se permiten varias
            // notas por item, estilo diario), la puntuación y los metadatos
            // que ya viven en MusicItems
            migrationBuilder.DropIndex(
                name: "IX_Reviews_UserId_ItemType_SpotifyItemId",
                table: "Notes");

            migrationBuilder.DropColumn(name: "ItemType", table: "Notes");
            migrationBuilder.DropColumn(name: "SpotifyItemId", table: "Notes");
            migrationBuilder.DropColumn(name: "ItemName", table: "Notes");
            migrationBuilder.DropColumn(name: "ArtistName", table: "Notes");
            migrationBuilder.DropColumn(name: "ImageUrl", table: "Notes");
            migrationBuilder.DropColumn(name: "RatingHalfStars", table: "Notes");

            migrationBuilder.AddForeignKey(
                name: "FK_Notes_MusicItems_MusicItemId",
                table: "Notes",
                column: "MusicItemId",
                principalTable: "MusicItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.CreateIndex(
                name: "IX_Notes_MusicItemId",
                table: "Notes",
                column: "MusicItemId");

            migrationBuilder.CreateIndex(
                name: "IX_Notes_UserId_CreatedAt",
                table: "Notes",
                columns: new[] { "UserId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Las puntuaciones se eliminan en el Up, así que no hay forma de
            // reconstruir las reseñas originales
            throw new NotSupportedException(
                "Esta migración transforma reseñas en notas y no tiene vuelta atrás.");
        }
    }
}
