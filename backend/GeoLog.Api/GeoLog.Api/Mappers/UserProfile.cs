using AutoMapper;
using GeoLog.Api.Data.Entities;
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
