using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace SameSpot.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOnboardingInterests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "OnboardingCompletedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Province",
                table: "Users",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Tags",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tags", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserTags",
                columns: table => new
                {
                    TagsId = table.Column<int>(type: "integer", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserTags", x => new { x.TagsId, x.UserId });
                    table.ForeignKey(
                        name: "FK_UserTags_Tags_TagsId",
                        column: x => x.TagsId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserTags_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Tags",
                columns: new[] { "Id", "Name" },
                values: new object[,]
                {
                    { 1, "Jazz nocturno" },
                    { 2, "Post-punk" },
                    { 3, "Charanga y fiesta" },
                    { 4, "Indie de carretera" },
                    { 5, "Cantautor e íntimo" },
                    { 6, "Electrónica de baile" },
                    { 7, "Ambient y calma" },
                    { 8, "Flamenco y raíz" },
                    { 9, "Hip-hop y rap" },
                    { 10, "Rock clásico" },
                    { 11, "Metal y ruido" },
                    { 12, "Pop luminoso" },
                    { 13, "Soul y funk" },
                    { 14, "Clásica y bandas sonoras" },
                    { 15, "Reggaetón y perreo" },
                    { 16, "Folk y acústico" }
                });

            // El seed inserta ids explícitos y la secuencia de la columna
            // identity se queda en 1; sin esto, el próximo INSERT sin id
            // (un tag nuevo desde la BD) chocaría con los ids 1-16
            migrationBuilder.Sql(
                """SELECT setval(pg_get_serial_sequence('"Tags"', 'Id'), 16);""");

            migrationBuilder.CreateIndex(
                name: "IX_Tags_Name",
                table: "Tags",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserTags_UserId",
                table: "UserTags",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserTags");

            migrationBuilder.DropTable(
                name: "Tags");

            migrationBuilder.DropColumn(
                name: "OnboardingCompletedAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Province",
                table: "Users");
        }
    }
}
