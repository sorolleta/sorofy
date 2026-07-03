using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SameSpot.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddNoteAnchor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AnchorArtistName",
                table: "Notes",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AnchorArtistSpotifyId",
                table: "Notes",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Notes_AnchorArtistSpotifyId",
                table: "Notes",
                column: "AnchorArtistSpotifyId",
                filter: "\"AnchorArtistSpotifyId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notes_AnchorArtistSpotifyId",
                table: "Notes");

            migrationBuilder.DropColumn(
                name: "AnchorArtistName",
                table: "Notes");

            migrationBuilder.DropColumn(
                name: "AnchorArtistSpotifyId",
                table: "Notes");
        }
    }
}
