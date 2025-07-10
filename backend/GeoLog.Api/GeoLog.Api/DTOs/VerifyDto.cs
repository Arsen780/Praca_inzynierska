using System.ComponentModel.DataAnnotations;

public class VerifyDto
{
    [Required]
    public string Token { get; set; }
}