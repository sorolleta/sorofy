using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SameSpot.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserLastEcosReadAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastEcosReadAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastEcosReadAt",
                table: "Users");
        }
    }
}
