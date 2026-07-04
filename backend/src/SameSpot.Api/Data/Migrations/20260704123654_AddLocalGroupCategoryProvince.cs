using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SameSpot.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLocalGroupCategoryProvince : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "MusicItems",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Province",
                table: "MusicItems",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_MusicItems_Province",
                table: "MusicItems",
                column: "Province",
                filter: "\"Province\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MusicItems_Province",
                table: "MusicItems");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "MusicItems");

            migrationBuilder.DropColumn(
                name: "Province",
                table: "MusicItems");
        }
    }
}
