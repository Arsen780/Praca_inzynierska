using AutoMapper;
using GeoLog.Api.Data.Entities; // Upewnij się, że masz ten using do Twojej encji User
using GeoLog.Api.DTOs;

namespace GeoLog.Api.Mappers
{
    public class UserProfile : Profile
    {
        public UserProfile()
        {
            CreateMap<User, UserDto>();
        }
    }
}
